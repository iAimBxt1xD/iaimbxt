const { isAuthed, envError, putFile, sameOrigin } = require("./_lib");

const NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,80}\.(png|jpe?g|webp|gif)$/i;
const MAGIC = b =>
  (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) ||            // png
  (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||                              // jpg
  (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP") || // webp
  b.slice(0, 3).toString() === "GIF";                                               // gif

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Origen no permitido." });
  if (!isAuthed(req)) return res.status(401).json({ error: "Sesión vencida. Vuelve a entrar." });
  const e = envError();
  if (e) return res.status(500).json({ error: e });

  const { name, data } = req.body || {};
  if (typeof name !== "string" || !NAME.test(name)) return res.status(400).json({ error: "Nombre de archivo no válido (solo png, jpg, webp o gif, sin espacios)." });
  if (typeof data !== "string") return res.status(400).json({ error: "Falta la imagen." });
  const buf = Buffer.from(data, "base64");
  if (!buf.length || buf.length > 3.2 * 1024 * 1024) return res.status(413).json({ error: "La imagen es demasiado grande (máx. ~3 MB)." });
  if (!MAGIC(buf)) return res.status(400).json({ error: "El archivo no parece una imagen válida." });

  try {
    await putFile("img/" + name, buf, "Subir imagen " + name + " desde el admin");
    res.status(200).json({ ok: true, path: "img/" + name });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};
