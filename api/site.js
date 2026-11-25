const { list } = require("@vercel/blob");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: "Contenido publicado no disponible." });

  try {
    const { blobs } = await list({ prefix: "published/site/" });
    const latest = blobs
      .filter(blob => blob.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    if (!latest) return res.status(404).json({ error: "Aún no hay una publicación dinámica." });

    const response = await fetch(latest.url, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo leer el contenido publicado.");
    const payload = await response.json();
    res.setHeader("ETag", `\"${latest.etag}\"`);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(503).json({ error: "No se pudo cargar la última publicación." });
  }
};
