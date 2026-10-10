// Standalone mode: runs the whole backend (wallets + OfflinePay engine) inside the phone app,
// so the demo needs no laptop or server. State is kept in this phone's local storage.
import { createEngine, initialState } from '/core/engine.js';
import { webPasswords } from '/core/passwords-web.js';
import { DEMO_ISSUER } from '/core/demo-issuer.js';

const KEY = 'opay:phone-backend';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

const state = load() || initialState();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
const engine = createEngine({ state, save, passwords: webPasswords, mode: 'local', issuer: DEMO_ISSUER });

export function request(method, path, body, auth) {
  return engine.handle(method, path, { body, auth });
}

export function erase() {
  try { localStorage.removeItem(KEY); } catch {}
}
