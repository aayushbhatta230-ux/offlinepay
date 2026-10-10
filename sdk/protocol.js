// OfflinePay protocol — shared by the SDK (browser) and the API (Node).
// Uses only WebCrypto, which exists in both environments.

export const VERSION = 1;
export const QR_PREFIX = 'OPAY1:';

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();

const KEY_ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN_ALG = { name: 'ECDSA', hash: 'SHA-256' };

// Deterministic JSON (sorted keys) so signer and verifier hash identical bytes.
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort()
    .filter((k) => value[k] !== undefined)
    .map((k) => JSON.stringify(k) + ':' + canonical(value[k]))
    .join(',') + '}';
}

export function b64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64u(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export function randomId(bytes = 12) {
  return b64u(globalThis.crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(str) {
  return b64u(new Uint8Array(await subtle.digest('SHA-256', enc.encode(str))));
}

export async function hashToken(token) {
  return sha256(canonical(token));
}

// Private key is non-extractable unless asked (the issuer needs to persist its key).
export function generateKeyPair(extractable = false) {
  return subtle.generateKey(KEY_ALG, extractable, ['sign', 'verify']);
}

export async function exportPublic(publicKey) {
  const { x, y } = await subtle.exportKey('jwk', publicKey);
  return { x, y };
}

export function importPublic({ x, y }) {
  return subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, ext: true }, KEY_ALG, true, ['verify']);
}

export function exportPrivateJwk(privateKey) {
  return subtle.exportKey('jwk', privateKey);
}

export function importPrivateJwk(jwk) {
  return subtle.importKey('jwk', jwk, KEY_ALG, false, ['sign']);
}

export async function signObject(privateKey, obj) {
  const { sig, ...body } = obj;
  const s = await subtle.sign(SIGN_ALG, privateKey, enc.encode(canonical(body)));
  return { ...body, sig: b64u(new Uint8Array(s)) };
}

export async function verifyObject(publicKeyOrJwk, obj) {
  const { sig, ...body } = obj || {};
  if (typeof sig !== 'string') return false;
  try {
    const key = publicKeyOrJwk.x ? await importPublic(publicKeyOrJwk) : publicKeyOrJwk;
    return await subtle.verify(SIGN_ALG, key, fromB64u(sig), enc.encode(canonical(body)));
  } catch {
    return false;
  }
}

// ---- QR payload encoding ----

export function encodeQR(obj) {
  return QR_PREFIX + JSON.stringify(obj);
}

export function decodeQR(text) {
  const t = String(text || '').trim();
  if (!t.startsWith(QR_PREFIX)) throw new Error('Not an OfflinePay code');
  return JSON.parse(t.slice(QR_PREFIX.length));
}

// ---- Validation shared by payee (offline) and API (settlement) ----

const isPosInt = (n) => Number.isInteger(n) && n > 0;

export async function verifyCert(issuerPub, cert, now = Date.now()) {
  if (!cert || cert.type !== 'cert' || cert.v !== VERSION) return { ok: false, reason: 'Malformed device certificate' };
  if (!(await verifyObject(issuerPub, cert))) return { ok: false, reason: 'Device certificate not signed by OfflinePay' };
  if (cert.exp < now) return { ok: false, reason: 'Device certificate expired' };
  return { ok: true };
}

export async function verifyPayment(issuerPub, token, now = Date.now()) {
  if (!token || token.type !== 'pay' || token.v !== VERSION) return { ok: false, reason: 'Malformed payment token' };
  if (!isPosInt(token.amount)) return { ok: false, reason: 'Invalid amount' };
  if (!isPosInt(token.counter)) return { ok: false, reason: 'Invalid counter' };
  if (!token.payee || !token.nonce || !token.txId) return { ok: false, reason: 'Missing fields' };
  const certCheck = await verifyCert(issuerPub, token.cert, now);
  if (!certCheck.ok) return certCheck;
  if (!(await verifyObject(token.cert.pub, token))) return { ok: false, reason: 'Invalid signature — token was altered or forged' };
  return { ok: true };
}
