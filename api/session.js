const { isAuthed } = require("./_lib");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  return res.status(200).json({ authenticated: isAuthed(req) });
};
