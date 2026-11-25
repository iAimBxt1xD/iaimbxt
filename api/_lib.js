// Utilidades compartidas por las funciones de /api (el guion bajo evita que sea una ruta pública)
const crypto = require("crypto");

const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";

function sign(payload) {
  const b = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const s = crypto.createHmac("sha256", secret()).update(b).digest("base64url");
  return b + "." + s;
}

function verify(token) {
  if (!token || !secret()) return false;
  const [b, s] = String(token).split(".");
  if (!b || !s) return false;
  const good = crypto.createHmac("sha256", secret()).update(b).digest("base64url");
  const A = Buffer.from(s), B = Buffer.from(good);
  if (A.length !== B.length || !crypto.timingSafeEqual(A, B)) return false;
  try { return JSON.parse(Buffer.from(b, "base64url").toString()).exp > Date.now(); } catch (e) { return false; }
}

function safeEq(a, b) {
  const h = x => crypto.createHash("sha256").update(String(x)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
}

function isAuthed(req) {
  return verify((req.headers.authorization || "").replace(/^Bearer\s+/i, ""));
}

function envError() {
  const miss = ["ADMIN_PASSWORD"].filter(k => !process.env[k]);
  return miss.length ? "Faltan variables de entorno en Vercel: " + miss.join(", ") : null;
}

const REPO = () => process.env.GITHUB_REPO || "iAimBxt1xD/iaimbxt";
const BRANCH = () => process.env.GITHUB_BRANCH || "main";
const api = p => `https://api.github.com/repos/${REPO()}/contents/${p.split("/").map(encodeURIComponent).join("/")}`;

// Token de GitHub: usa GITHUB_TOKEN si existe; si no, pide uno temporal a Vercel Connect (GitHub App)
async function ghToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const { getToken } = await import("@vercel/connect"); // paquete ESM: import dinámico
  return getToken(process.env.CONNECT_CONNECTOR || "github/iaimbxt", { subject: { type: "app" } });
}
const headers = async () => ({
  Authorization: "Bearer " + (await ghToken()),
  Accept: "application/vnd.github+json",
  "User-Agent": "portafolio-admin",
  "X-GitHub-Api-Version": "2022-11-28"
});

// Crea o reemplaza un archivo del repo con un commit. Devuelve {unchanged:true} si no hay cambios.
async function putFile(path, buf, message, tries = 2) {
  const requestHeaders = await headers();
  const g = await fetch(api(path) + "?ref=" + encodeURIComponent(BRANCH()), { headers: requestHeaders });
  let sha, same = false;
  if (g.ok) {
    const j = await g.json();
    sha = j.sha;
    if (j.content && Buffer.from(j.content.replace(/\n/g, ""), "base64").equals(buf)) same = true;
  } else if (g.status !== 404) {
    throw new Error("GitHub respondió " + g.status + " al leer " + path + (g.status === 401 || g.status === 403 ? " (revisa los permisos de la GitHub App o GITHUB_TOKEN)" : ""));
  }
  if (same) return { unchanged: true };
  const r = await fetch(api(path), {
    method: "PUT",
    headers: { ...requestHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: buf.toString("base64"), branch: BRANCH(), ...(sha ? { sha } : {}) })
  });
  if (r.status === 409 && tries > 1) return putFile(path, buf, message, tries - 1);
  if (!r.ok) {
    const t = await r.text();
    throw new Error("GitHub respondió " + r.status + " al guardar " + path + ": " + t.slice(0, 200));
  }
  return { unchanged: false };
}

// Solo se aceptan peticiones que vengan de este mismo sitio
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true; // peticiones sin Origin (no navegador) igual necesitan token/contraseña
  try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
}

// Límite de intentos de login por IP (en memoria; frena fuerza bruta básica)
const FAILS = new Map();
const ip = req => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
function locked(req) { const f = FAILS.get(ip(req)); return !!f && f.until > Date.now(); }
function fail(req) {
  const k = ip(req), f = FAILS.get(k) || { n: 0, until: 0 };
  f.n++; if (f.n >= 5) { f.until = Date.now() + 15 * 60 * 1000; f.n = 0; }
  FAILS.set(k, f);
  if (FAILS.size > 500) FAILS.clear();
}
function ok(req) { FAILS.delete(ip(req)); }

// Valida que los datos del sitio sean solo texto/números/listas razonables
function cleanData(v, depth = 0) {
  if (depth > 6) return false;
  if (v === null || typeof v === "number" || typeof v === "boolean") return true;
  if (typeof v === "string") return v.length <= 5000;
  if (Array.isArray(v)) return v.length <= 500 && v.every(x => cleanData(x, depth + 1));
  if (typeof v === "object") {
    const k = Object.keys(v);
    return k.length <= 60 && k.every(x => x !== "__proto__" && x !== "constructor" && x.length <= 60 && cleanData(v[x], depth + 1));
  }
  return false;
}

module.exports = { sign, safeEq, isAuthed, envError, putFile, sameOrigin, locked, fail, ok, cleanData };
