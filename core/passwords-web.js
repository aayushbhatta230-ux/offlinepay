// Password hashing with WebCrypto PBKDF2-SHA256 (used when the backend runs on the phone).
import { b64u, fromB64u } from '../sdk/protocol.js';

const ITERATIONS = 150000;
const enc = new TextEncoder();

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

export const webPasswords = {
  async hash(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return `pbkdf2$${ITERATIONS}$${b64u(salt)}$${b64u(await derive(password, salt, ITERATIONS))}`;
  },
  async verify(password, stored) {
    const [scheme, iter, salt, hash] = String(stored || '').split('$');
    if (scheme !== 'pbkdf2' || !salt || !hash) return false;
    const actual = await derive(password, fromB64u(salt), Number(iter));
    const expected = fromB64u(hash);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]; // constant-time compare
    return diff === 0;
  },
};
