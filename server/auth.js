// Password hashing for the laptop server (scrypt). The phone uses core/passwords-web.js instead.
import crypto from 'node:crypto';

export const scryptPasswords = {
  async hash(password) {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
  },
  async verify(password, stored) {
    const [scheme, salt, hash] = String(stored || '').split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'base64');
    const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length);
    return crypto.timingSafeEqual(actual, expected);
  },
};
