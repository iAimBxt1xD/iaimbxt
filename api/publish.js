const { isAuthed, envError, putFile, sameOrigin, cleanData } = require("./_lib");

const ARR = ["stats", "plugins", "servers", "skills", "reviews", "works", "contact"];

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Origen no permitido." });
  if (!isAuthed(req)) return res.status(401).json({ error: "Sesión vencida. Vuelve a entrar." });
  const e = envError();
  if (e) return res.status(500).json({ error: e });

  const s = req.body && req.body.site;
  const ok = s && typeof s === "object" && !Array.isArray(s) &&
    s.hero && s.theme && s.sec && s.loader && s.links && ARR.every(k => Array.isArray(s[k])) && cleanData(s);
  if (!ok) return res.status(400).json({ error: "Los datos no tienen el formato correcto." });

  // Mismo formato exacto que genera el panel (para poder comprobar que ya está en vivo)
  const text = "window.SITE=" + JSON.stringify(s, null, 1) + ";\n";
  if (text.length > 900000) return res.status(413).json({ error: "data.js es demasiado grande." });

  try {
    const r = await putFile("data.js", Buffer.from(text, "utf8"), "Actualizar portafolio desde el admin");
    res.status(200).json({ ok: true, unchanged: r.unchanged });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
};
