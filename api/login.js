const { sign, safeEq, sameOrigin, locked, fail, ok } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Origen no permitido." });
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: "Falta la variable ADMIN_PASSWORD en Vercel." });
  if (locked(req)) return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
  const pw = req.body && req.body.password;
  if (typeof pw !== "string" || pw.length > 200 || !safeEq(pw, process.env.ADMIN_PASSWORD)) {
    fail(req);
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: "Contraseña incorrecta." });
  }
  ok(req);
  const token = sign({ exp: Date.now() + 8 * 3600 * 1000 });
  res.setHeader("Set-Cookie", `iaimbxt_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=28800`);
  res.status(200).json({ ok: true });
};
