const { sameOrigin } = require("./_lib");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Origen no permitido." });
  res.setHeader("Set-Cookie", "iaimbxt_session=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0");
  return res.status(200).json({ ok: true });
};
