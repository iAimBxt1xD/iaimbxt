const crypto = require("crypto");
const { isAuthed, envError, sameOrigin } = require("./_lib");

const IMAGE_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,80}\.(png|jpe?g|webp|gif)$/i;
const JAR_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,80}\.jar$/i;
const isImage = buffer =>
  (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) ||
  (buffer.slice(0, 4).toString() === "RIFF" && buffer.slice(8, 12).toString() === "WEBP") ||
  (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
  buffer.slice(0, 3).toString() === "GIF";
const isJar = buffer => buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
const contentTypeFor = name => {
  const extension = name.split(".").pop().toLowerCase();
  return ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", jar: "application/java-archive" })[extension];
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Origen no permitido." });
  if (!isAuthed(req)) return res.status(401).json({ error: "Sesión vencida. Vuelve a entrar." });
  const configurationError = envError();
  if (configurationError) return res.status(500).json({ error: configurationError });

  const { name, data, kind } = req.body || {};
  if (typeof data !== "string" || data.length > 4.4 * 1024 * 1024) {
    return res.status(413).json({ error: "El archivo es demasiado grande (máx. ~3 MB)." });
  }
  const buffer = Buffer.from(data, "base64");
  if (!buffer.length || buffer.length > 3.2 * 1024 * 1024) {
    return res.status(413).json({ error: "El archivo es demasiado grande (máx. ~3 MB)." });
  }

  const plugin = kind === "plugin";
  if (typeof name !== "string" || !(plugin ? JAR_NAME : IMAGE_NAME).test(name)) {
    return res.status(400).json({ error: plugin ? "Nombre no válido (solo .jar, sin espacios)." : "Nombre de archivo no válido (solo png, jpg, webp o gif, sin espacios)." });
  }
  if (plugin ? !isJar(buffer) : !isImage(buffer)) {
    return res.status(400).json({ error: plugin ? "El archivo no parece un .jar válido." : "El archivo no parece una imagen válida." });
  }

  const pathname = `media/${crypto.createHash("sha256").update(buffer).digest("hex")}-${name}`;
  try {
    const { put } = await import("@vercel/blob");
    await put(pathname, buffer, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: contentTypeFor(name)
    });
    return res.status(200).json({ ok: true, path: pathname, url: `/api/asset?path=${pathname}` });
  } catch (error) {
    return res.status(502).json({ error: "No se pudo guardar el archivo en Blob." });
  }
};
