// Mock partner wallets ("PayA", "PayB") — stand-ins for eSewa/Khalti-style backends.
// They own users, KYC and money. They integrate OfflinePay via its API + webhooks.

import express from 'express';
import { createStore } from './db.js';
import { PARTNERS } from './offlinepay-api.js';

const SEED = {
  paya: {
    aarav: { name: 'Aarav Shrestha', type: 'personal', main: 8000 },
    lodge: { name: 'Sagarmatha Lodge', type: 'merchant', main: 2000 },
  },
  payb: {
    teahouse: { name: 'Himalaya Tea House', type: 'merchant', main: 1500 },
    bina: { name: 'Bina Gurung', type: 'personal', main: 5000 },
  },
};

function seed(id) {
  const accounts = {};
  for (const [acc, a] of Object.entries(SEED[id])) {
    accounts[acc] = { ...a, locked: 0, frozen: false, history: [{ at: Date.now(), text: 'Opening balance', amount: a.main }] };
  }
  return { accounts };
}

let baseUrl = '';
export function setWalletBaseUrl(url) { baseUrl = url; }

export function walletRouter(id) {
  const store = createStore(`wallet-${id}`, () => seed(id));
  const accounts = () => store.data.accounts;
  const partner = PARTNERS[id];
  const r = express.Router();
  r.use(express.json());

  const offlinepay = async (path, body) => {
    const res = await fetch(`${baseUrl}/v1${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${partner.key}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'OfflinePay error');
    return data;
  };

  const getAcc = (req, res) => {
    const a = accounts()[req.body?.account ?? req.query.account];
    if (!a) res.status(404).json({ error: 'Unknown account' });
    return a;
  };
  const note = (a, text, amount) => { a.history.unshift({ at: Date.now(), text, amount }); store.save(); };
  const view = (acc, a) => ({ account: acc, name: a.name, type: a.type, main: a.main, locked: a.locked, frozen: a.frozen, history: a.history.slice(0, 30) });

  r.get('/api/users', (req, res) => {
    res.json({ wallet: partner.name, users: Object.entries(accounts()).map(([acc, a]) => ({ account: acc, name: a.name, type: a.type })) });
  });

  // For the demo dashboard: the wallet's ledger at a glance.
  r.get('/api/ledger', (req, res) => {
    res.json(Object.entries(accounts()).map(([acc, a]) => ({ account: acc, name: a.name, main: a.main, locked: a.locked, frozen: a.frozen })));
  });

  r.get('/api/me', (req, res) => {
    const a = getAcc(req, res); if (!a) return;
    res.json(view(req.query.account, a));
  });

  r.post('/api/topup', (req, res) => {
    const a = getAcc(req, res); if (!a) return;
    const amount = Number(req.body.amount);
    if (!Number.isInteger(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    a.main += amount;
    note(a, 'Loaded from bank (demo)', amount);
    res.json(view(req.body.account, a));
  });

  r.post('/api/send', (req, res) => {
    const a = getAcc(req, res); if (!a) return;
    const to = accounts()[req.body.to];
    const amount = Number(req.body.amount);
    if (!to) return res.status(404).json({ error: `No ${partner.name} user "${req.body.to}"` });
    if (a.frozen) return res.status(403).json({ error: 'Account frozen' });
    if (!Number.isInteger(amount) || amount <= 0 || amount > a.main) return res.status(400).json({ error: 'Invalid amount' });
    a.main -= amount; to.main += amount;
    note(a, `Sent to ${to.name}`, -amount);
    note(to, `Received from ${a.name}`, amount);
    res.json(view(req.body.account, a));
  });

  // ---- OfflinePay integration ----
  r.post('/api/offline/enable', async (req, res) => {
    const a = getAcc(req, res); if (!a) return;
    if (a.frozen) return res.status(403).json({ error: 'Account frozen' });
    try {
      const { cert } = await offlinepay('/devices/register', { account: req.body.account, name: a.name, pub: req.body.pub });
      note(a, 'Offline Pay enabled on this phone', 0);
      res.json({ cert });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  r.post('/api/offline/load', async (req, res) => {
    const a = getAcc(req, res); if (!a) return;
    const amount = Number(req.body.amount);
    if (a.frozen) return res.status(403).json({ error: 'Account frozen' });
    if (!Number.isInteger(amount) || amount <= 0 || amount > a.main) return res.status(400).json({ error: 'Not enough balance' });
    try {
      const { loadCert } = await offlinepay('/offline/load', { deviceId: req.body.deviceId, amount });
      a.main -= amount; a.locked += amount;  // money is locked in OUR ledger; OfflinePay never holds it
      note(a, 'Moved to offline vault', -amount);
      res.json({ loadCert });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  r.post('/webhooks/offlinepay', (req, res) => {
    if (req.get('X-OfflinePay-Secret') !== partner.key) return res.status(401).end();
    const { event, data } = req.body;
    const a = accounts()[data.account];
    if (!a) return res.status(404).end();
    if (event === 'settlement.debit') {
      a.locked -= data.amount;
      note(a, `Offline payment to ${data.to.name} settled`, 0);
    } else if (event === 'settlement.credit') {
      a.main += data.amount;
      note(a, `Offline payment from ${data.from.name}${data.from.partner !== id ? ` (${PARTNERS[data.from.partner].name})` : ''}`, data.amount);
    } else if (event === 'settlement.rejected') {
      note(a, `⚠️ Offline payment rejected: ${data.reason}`, 0);
    } else if (event === 'fraud.detected') {
      a.frozen = true;
      note(a, `🚩 Account frozen — ${data.reason}`, 0);
    }
    store.save();
    res.json({ ok: true });
  });

  r.post('/api/reset', (req, res) => { store.reset(); res.json({ ok: true }); });

  return r;
}
