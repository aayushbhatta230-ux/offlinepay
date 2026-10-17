// Optional laptop server: exposes the engine over HTTP and serves the web apps + dashboard.
// The Android app does not need this — by default it runs the same engine on the phone.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createEngine, initialState } from '../core/engine.js';
import { createStore, DATA_DIR } from './db.js';
import { scryptPasswords } from './auth.js';

const PORT = Number(process.env.PORT) || 3000;
const root = path.resolve(import.meta.dirname, '..');

// One-time migration from the earlier per-service data files.
function migrate() {
  const old = (n) => { try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${n}.json`), 'utf8')); } catch { return null; } };
  if (fs.existsSync(path.join(DATA_DIR, 'state.json'))) return null;
  const op = old('offlinepay'), a = old('wallet-paya'), b = old('wallet-payb');
  if (!op && !a && !b) return null;
  const s = { ...initialState(), ...(op || {}) };
  s.wallets = { paya: a || { accounts: {}, sessions: {} }, payb: b || { accounts: {}, sessions: {} } };
  for (const w of Object.values(s.wallets)) {
    w.sessions = {}; // session format changed; users simply sign in again
    for (const acc of Object.keys(w.accounts)) if (!w.accounts[acc].passwordHash) delete w.accounts[acc]; // old seed users
  }
  return s;
}

const migrated = migrate();
const store = createStore('state', () => migrated || initialState());
if (migrated) store.save();
const engine = createEngine({ state: store.data, save: store.save, passwords: scryptPasswords, mode: 'server' });

const app = express();

// The Android app (server mode) loads its UI from its own origin, so the APIs allow cross-origin calls.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const api = async (req, res) => {
  const auth = req.get('Authorization')?.replace(/^Bearer /, '');
  const r = await engine.handle(req.method, req.originalUrl, { body: req.body, auth });
  res.status(r.status).json(r.body);
};
app.all('/v1/*', express.json({ limit: '1mb' }), api);
app.all('/:wallet(paya|payb)/api/*', express.json(), api);

for (const id of ['paya', 'payb']) app.use(`/${id}`, express.static(path.join(root, 'apps', 'wallet')));
app.use('/sdk', express.static(path.join(root, 'sdk')));
app.use('/core', express.static(path.join(root, 'core')));
app.use('/dashboard', express.static(path.join(root, 'apps', 'dashboard')));
app.use('/presentation', express.static(path.join(root, 'presentation')));
app.use('/vendor/qrcode.js', (req, res) => res.sendFile(path.join(root, 'node_modules', 'qrcode-generator', 'qrcode.js')));
app.use('/vendor/jsQR.js', (req, res) => res.sendFile(path.join(root, 'node_modules', 'jsqr', 'dist', 'jsQR.js')));
app.get('/', (req, res) => res.sendFile(path.join(root, 'apps', 'home.html')));

app.listen(PORT, () => {
  const lan = Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i.address}:${PORT}`);
  console.log(`OfflinePay demo server running:
  Home           http://localhost:${PORT}/
  PayA wallet    http://localhost:${PORT}/paya/
  PayB wallet    http://localhost:${PORT}/payb/
  Dashboard      http://localhost:${PORT}/dashboard/
  3D Pitch Deck  http://localhost:${PORT}/presentation/
  For the Android app's server mode: ${lan.join('  or  ') || '(no network found)'}`);
});
