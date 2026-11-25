const { sign, safeEq, sameOrigin, locked, fail, ok, setSessionCookie } = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Origen no permitido." });
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: "Falta la variable ADMIN_PASSWORD en Vercel." });
  if (locked(req)) return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
  const password = req.body && req.body.password;
  if (typeof password !== "string" || password.length > 200 || !safeEq(password, process.env.ADMIN_PASSWORD)) {
    fail(req);
    await new Promise(resolve => setTimeout(resolve, 800));
    return res.status(401).json({ error: "Contraseña incorrecta." });
  }
  ok(req);
  setSessionCookie(res, sign({ exp: Date.now() + 8 * 60 * 60 * 1000 }));
  res.status(200).json({ ok: true });
};
