const { Readable } = require("node:stream");

const ASSET_PATH = /^media\/[a-f0-9]{64}-[A-Za-z0-9_-][A-Za-z0-9._-]{0,80}\.(?:png|jpe?g|webp|gif|jar)$/i;

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).send("Método no permitido");
  const pathname = typeof req.query.path === "string" ? req.query.path : "";
  if (!ASSET_PATH.test(pathname)) return res.status(404).send("No encontrado");

  try {
    const { get } = await import("@vercel/blob");
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200) return res.status(404).send("No encontrado");

    const filename = pathname.slice(pathname.indexOf("-") + 1);
    res.setHeader("Content-Type", result.blob.contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    if (filename.toLowerCase().endsWith(".jar")) {
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    res.status(200);
    return Readable.fromWeb(result.stream).pipe(res);
  } catch (error) {
    return res.status(502).send("No se pudo entregar el archivo.");
  }
};
