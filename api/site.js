const { getStoredSite, validSite } = require("./_lib");
const defaultSite = require("./_default-site");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).send("Método no permitido");

  try {
    const site = await getStoredSite() || defaultSite;
    if (!validSite(site)) return res.status(500).send("El contenido del sitio no es válido.");
    const serialized = JSON.stringify(site).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    return res.status(200).send(`window.SITE=${serialized};`);
  } catch (error) {
    return res.status(503).send("No se pudo cargar el contenido del sitio.");
  }
};
