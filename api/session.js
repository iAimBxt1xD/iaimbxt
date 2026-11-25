const { isAuthed } = require("./_lib");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  if (!isAuthed(req)) return res.status(401).json({ ok: false });
  return res.status(200).json({ ok: true });
};
