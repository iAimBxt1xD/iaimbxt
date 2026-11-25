const crypto = require("crypto");
const { put } = require("@vercel/blob");
const { isAuthed, sameOrigin, cleanData } = require("./_lib");

const ARR = ["stats", "plugins", "servers", "skills", "reviews", "works", "contact"];
const PAGE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const safeMedia = value => {
  if (typeof value !== "string") return false;
  if (/^(?:img|trabajos)\/[A-Za-z0-9._/-]{1,240}$/.test(value)) return true;
  try { return new URL(value).protocol === "https:" && new URL(value).hostname.endsWith(".public.blob.vercel-storage.com"); }
  catch (error) { return false; }
};

function validPages(pages) {
  if (pages == null) return true;
  if (!Array.isArray(pages) || pages.length > 100) return false;
  const slugs = new Set();
  return pages.every(page => {
    if (!page || typeof page !== "object" || Array.isArray(page)) return false;
    const slug = typeof page.slug === "string" ? page.slug : "";
    if (!PAGE_SLUG.test(slug) || slugs.has(slug)) return false;
    slugs.add(slug);
    return typeof page.title === "string" && page.title.trim().length > 0 && page.title.length <= 160 &&
      typeof page.description === "string" && page.description.length <= 5000 &&
      (page.category == null || typeof page.category === "string" && page.category.length <= 80) &&
      (page.visible == null || typeof page.visible === "boolean") &&
      Array.isArray(page.images) && page.images.length <= 40 && page.images.every(image => safeMedia(image)) &&
      (page.cover == null || page.cover === "" || safeMedia(page.cover));
  });
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Origen no permitido." });
  if (!isAuthed(req)) return res.status(401).json({ error: "Sesión vencida. Vuelve a entrar." });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "El almacenamiento de publicaciones no está disponible." });

  const site = req.body && req.body.site;
  const valid = site && typeof site === "object" && !Array.isArray(site) &&
    site.hero && site.theme && site.sec && site.loader && site.links &&
    ARR.every(key => Array.isArray(site[key])) && validPages(site.pages) && cleanData(site);
  if (!valid) return res.status(400).json({ error: "Los datos no tienen el formato correcto." });

  const body = Buffer.from(JSON.stringify({ site, publishedAt: new Date().toISOString() }));
  if (body.length > 900000) return res.status(413).json({ error: "El contenido supera el límite permitido." });

  try {
    const version = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    await put(`published/site/${version}.json`, body, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: 31536000
    });
    return res.status(200).json({ ok: true, version, publishedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(502).json({ error: "No se pudo guardar la publicación. Inténtalo de nuevo." });
  }
};
