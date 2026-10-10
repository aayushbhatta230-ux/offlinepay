import express from 'express';
import path from 'node:path';
import os from 'node:os';
import { offlinepayRouter, setBaseUrl } from './offlinepay-api.js';
import { walletRouter, setWalletBaseUrl } from './wallets.js';

const PORT = Number(process.env.PORT) || 3000;
const root = path.resolve(import.meta.dirname, '..');
const app = express();

// The Android app loads its UI from its own origin, so the APIs must allow cross-origin calls.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// OfflinePay (our product)
app.use('/v1', offlinepayRouter());

// Mock partner wallets: backend + the same wallet app themed per partner
for (const id of ['paya', 'payb']) {
  app.use(`/${id}`, walletRouter(id));
  app.use(`/${id}`, express.static(path.join(root, 'apps', 'wallet')));
}

app.use('/sdk', express.static(path.join(root, 'sdk')));
app.use('/dashboard', express.static(path.join(root, 'apps', 'dashboard')));
app.use('/vendor/qrcode.js', (req, res) => res.sendFile(path.join(root, 'node_modules', 'qrcode-generator', 'qrcode.js')));
app.use('/vendor/jsQR.js', (req, res) => res.sendFile(path.join(root, 'node_modules', 'jsqr', 'dist', 'jsQR.js')));
app.get('/', (req, res) => res.sendFile(path.join(root, 'apps', 'home.html')));

const local = `http://127.0.0.1:${PORT}`;
setBaseUrl(local);
setWalletBaseUrl(local);

app.listen(PORT, () => {
  const lan = Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i.address}:${PORT}`);
  console.log(`OfflinePay demo running:
  Home        http://localhost:${PORT}/
  PayA wallet http://localhost:${PORT}/paya/
  PayB wallet http://localhost:${PORT}/payb/
  Dashboard   http://localhost:${PORT}/dashboard/
  Server address for the Android app: ${lan.join('  or  ') || '(no network found)'}`);
});
