// Shared utilities for the API routes. The underscore prevents this file from becoming a public route.
const crypto = require("crypto");

const SESSION_COOKIE = "__Host-admin_session";
const SESSION_MAX_AGE = 8 * 60 * 60;
const SITE_BLOB_PATH = "site/content.json";
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return body + "." + signature;
}

function verify(token) {
  if (!token || !secret()) return false;
  const [body, signature] = String(token).split(".");
  if (!body || !signature) return false;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return false;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()).exp > Date.now(); } catch (error) { return false; }
}

function cookieValue(req, name) {
  for (const item of String(req.headers.cookie || "").split(";")) {
    const separator = item.indexOf("=");
    if (separator >= 0 && item.slice(0, separator).trim() === name) return item.slice(separator + 1).trim();
  }
  return "";
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Strict`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`);
}

function safeEq(a, b) {
  const hash = value => crypto.createHash("sha256").update(String(value)).digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
}

function isAuthed(req) {
  return verify(cookieValue(req, SESSION_COOKIE));
}

function envError() {
  const missing = ["ADMIN_PASSWORD"].filter(key => !process.env[key]);
  return missing.length ? "Faltan variables de entorno en Vercel: " + missing.join(", ") : null;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = String(req.headers.host || "").toLowerCase();
  if (!origin || !host) return false;
  try { return new URL(origin).host.toLowerCase() === host; } catch (error) { return false; }
}

const FAILS = new Map();
const ip = req => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
function locked(req) { const failure = FAILS.get(ip(req)); return !!failure && failure.until > Date.now(); }
function fail(req) {
  const key = ip(req), failure = FAILS.get(key) || { count: 0, until: 0 };
  failure.count++;
  if (failure.count >= 5) { failure.until = Date.now() + 15 * 60 * 1000; failure.count = 0; }
  FAILS.set(key, failure);
  if (FAILS.size > 500) FAILS.clear();
}
function ok(req) { FAILS.delete(ip(req)); }

function cleanData(value, depth = 0) {
  if (depth > 6) return false;
  if (value === null || typeof value === "number" || typeof value === "boolean") return true;
  if (typeof value === "string") return value.length <= 5000;
  if (Array.isArray(value)) return value.length <= 500 && value.every(item => cleanData(item, depth + 1));
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return keys.length <= 60 && keys.every(key => key !== "__proto__" && key !== "constructor" && key.length <= 60 && cleanData(value[key], depth + 1));
  }
  return false;
}

const SITE_ARRAYS = ["stats", "plugins", "servers", "skills", "reviews", "works", "contact"];
function validSite(site) {
  return !!site && typeof site === "object" && !Array.isArray(site) &&
    site.hero && typeof site.hero === "object" && site.theme && typeof site.theme === "object" &&
    site.sec && typeof site.sec === "object" && site.loader && typeof site.loader === "object" &&
    site.links && typeof site.links === "object" && SITE_ARRAYS.every(key => Array.isArray(site[key])) && cleanData(site);
}

async function getStoredSite() {
  const { get } = await import("@vercel/blob");
  const result = await get(SITE_BLOB_PATH, { access: "private", useCache: false });
  if (!result || result.statusCode === 404) return null;
  if (result.statusCode !== 200) throw new Error("No se pudo leer el contenido del sitio desde Blob.");
  return JSON.parse(await new Response(result.stream).text());
}

async function putStoredSite(site) {
  const { put } = await import("@vercel/blob");
  return put(SITE_BLOB_PATH, Buffer.from(JSON.stringify(site), "utf8"), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8"
  });
}

module.exports = {
  sign, safeEq, isAuthed, envError, sameOrigin, locked, fail, ok, cleanData, validSite,
  setSessionCookie, clearSessionCookie, getStoredSite, putStoredSite
};
