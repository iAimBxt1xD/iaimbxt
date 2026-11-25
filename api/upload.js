const crypto = require("crypto");
const { put } = require("@vercel/blob");
const { isAuthed, envError, putFile, sameOrigin } = require("./_lib");

const NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,80}\.(png|jpe?g|webp|gif)$/i;
const JAR = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,80}\.jar$/i;
const MAGIC = b =>
  (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) ||
  (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
  (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP") ||
  b.slice(0, 3).toString() === "GIF";
const ZIP = b => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
const contentType = b => b[0] === 0x89 ? "image/png" : b[0] === 0xff ? "image/jpeg" :
  b.slice(0, 3).toString() === "GIF" ? "image/gif" : "image/webp";

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Origen no permitido." });
  if (!isAuthed(req)) return res.status(401).json({ error: "Sesión vencida. Vuelve a entrar." });
  const env = envError();
  if (env) return res.status(500).json({ error: env });

  const { name, data, kind } = req.body || {};
  if (typeof data !== "string" || data.length > 4.4 * 1024 * 1024 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
    return res.status(400).json({ error: "El archivo no tiene un formato válido." });
  }
  const buffer = Buffer.from(data, "base64");
  if (!buffer.length || buffer.length > 3.2 * 1024 * 1024) return res.status(413).json({ error: "El archivo supera el límite de 3 MB." });

  if (kind === "plugin") {
    if (typeof name !== "string" || !JAR.test(name)) return res.status(400).json({ error: "Nombre no válido (solo .jar, sin espacios)." });
    if (!ZIP(buffer)) return res.status(400).json({ error: "El archivo no parece un .jar válido." });
    try {
      const result = await putFile("plugins/" + name, buffer, "Subir plugin " + name + " desde el admin");
      return res.status(200).json({ ok: true, path: "plugins/" + name, unchanged: result.unchanged });
    } catch (error) {
      return res.status(502).json({ error: "No se pudo guardar el plugin." });
    }
  }

  if (typeof name !== "string" || !NAME.test(name)) return res.status(400).json({ error: "Nombre no válido (solo png, jpg, webp o gif)." });
  if (!MAGIC(buffer)) return res.status(400).json({ error: "El archivo no parece una imagen válida." });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "El almacenamiento de imágenes no está disponible." });

  try {
    const pathname = `media/${crypto.randomUUID()}-${name}`;
    const blob = await put(pathname, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: contentType(buffer),
      cacheControlMaxAge: 31536000
    });
    return res.status(200).json({ ok: true, path: blob.url, url: blob.url, pathname: blob.pathname });
  } catch (error) {
    return res.status(502).json({ error: "No se pudo subir la imagen. Inténtalo de nuevo." });
  }
};
