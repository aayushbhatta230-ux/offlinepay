// Password hashing and sessions for the mock wallets.
import crypto from 'node:crypto';

const SESSION_TTL = 30 * 24 * 3600 * 1000;   // 30 days
const MAX_FAILS = 5;
const LOCK_MS = 60 * 1000;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Only a hash of the token is stored, so a leaked data file cannot be used to log in.
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('base64url');

export function createSession(sessions, account) {
  const token = crypto.randomBytes(32).toString('base64url');
  sessions[tokenHash(token)] = { account, expires: Date.now() + SESSION_TTL };
  return token;
}

export function findSession(sessions, token) {
  if (!token) return null;
  const s = sessions[tokenHash(token)];
  if (!s) return null;
  if (s.expires < Date.now()) { delete sessions[tokenHash(token)]; return null; }
  return s;
}

export function deleteSession(sessions, token) {
  if (token) delete sessions[tokenHash(token)];
}

// Simple per-username lockout against password guessing.
const fails = new Map();
export function loginLocked(key) {
  const f = fails.get(key);
  return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0;
}
export function recordLoginFailure(key) {
  const f = fails.get(key) || { count: 0, until: 0 };
  f.count++;
  if (f.count >= MAX_FAILS) { f.until = Date.now() + LOCK_MS; f.count = 0; }
  fails.set(key, f);
}
export function clearLoginFailures(key) { fails.delete(key); }

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const MIN_PASSWORD = 8;
