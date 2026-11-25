const { isAuthed, envError, sameOrigin, validSite, putStoredSite } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Origen no permitido." });
  if (!isAuthed(req)) return res.status(401).json({ error: "Sesión vencida. Vuelve a entrar." });
  const configurationError = envError();
  if (configurationError) return res.status(500).json({ error: configurationError });

  const site = req.body && req.body.site;
  if (!validSite(site)) return res.status(400).json({ error: "Los datos no tienen el formato correcto." });
  if (Buffer.byteLength(JSON.stringify(site), "utf8") > 900000) {
    return res.status(413).json({ error: "El contenido del sitio es demasiado grande." });
  }

  try {
    await putStoredSite(site);
    return res.status(200).json({ ok: true, publishedAt: Date.now() });
  } catch (error) {
    return res.status(502).json({ error: "No se pudieron publicar los cambios en Blob." });
  }
};
