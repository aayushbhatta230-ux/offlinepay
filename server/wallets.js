// Mock partner wallets ("PayA", "PayB") — stand-ins for eSewa/Khalti-style backends.
// They own users, logins and money. They integrate OfflinePay via its API + webhooks.

import express from 'express';
import { createStore } from './db.js';
import { PARTNERS } from './offlinepay-api.js';
import {
  hashPassword, verifyPassword, createSession, findSession, deleteSession,
  loginLocked, recordLoginFailure, clearLoginFailures, USERNAME_RE, MIN_PASSWORD,
} from './auth.js';

const OPENING_BALANCE = 5000; // demo money every new account starts with

let baseUrl = '';
export function setWalletBaseUrl(url) { baseUrl = url; }

export function walletRouter(id) {
  const store = createStore(`wallet-${id}`, () => ({ accounts: {}, sessions: {} }));
  const db = () => store.data;
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

  const note = (a, text, amount) => { a.history.unshift({ at: Date.now(), text, amount }); store.save(); };
  const view = (acc, a) => ({ account: acc, name: a.name, type: a.type, main: a.main, locked: a.locked, frozen: a.frozen, history: a.history.slice(0, 30) });
  const bearer = (req) => req.get('Authorization')?.replace(/^Bearer /, '') || '';

  // Every route below `auth` acts on the signed-in user only — never on an account named in the request.
  const auth = (req, res, next) => {
    const s = findSession(db().sessions, bearer(req));
    const a = s && db().accounts[s.account];
    if (!a) return res.status(401).json({ error: 'Please sign in again' });
    req.username = s.account;
    req.acc = a;
    next();
  };

  // ---- accounts ----
  r.post('/api/signup', (req, res) => {
    const name = String(req.body?.name || '').trim();
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const type = req.body?.type === 'merchant' ? 'merchant' : 'personal';
    if (name.length < 2 || name.length > 40) return res.status(400).json({ error: 'Enter your full name' });
    if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'Username: 3–20 lowercase letters, numbers or _' });
    if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
    if (db().accounts[username]) return res.status(409).json({ error: 'That username is taken' });

    const a = { name, type, passwordHash: hashPassword(password), main: OPENING_BALANCE, locked: 0, frozen: false, history: [], createdAt: Date.now() };
    db().accounts[username] = a;
    note(a, 'Opening balance (demo money)', OPENING_BALANCE);
    const token = createSession(db().sessions, username);
    store.save();
    res.json({ token, me: view(username, a) });
  });

  r.post('/api/login', (req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const wait = loginLocked(`${id}:${username}`);
    if (wait) return res.status(429).json({ error: `Too many attempts — try again in ${wait}s` });
    const a = db().accounts[username];
    if (!a || !verifyPassword(password, a.passwordHash)) {
      recordLoginFailure(`${id}:${username}`);
      return res.status(401).json({ error: 'Wrong username or password' });
    }
    clearLoginFailures(`${id}:${username}`);
    const token = createSession(db().sessions, username);
    store.save();
    res.json({ token, me: view(username, a) });
  });

  r.post('/api/logout', (req, res) => {
    deleteSession(db().sessions, bearer(req));
    store.save();
    res.json({ ok: true });
  });

  r.get('/api/me', auth, (req, res) => res.json(view(req.username, req.acc)));

  // For the demo dashboard: the wallet's ledger at a glance (no passwords).
  r.get('/api/ledger', (req, res) => {
    res.json(Object.entries(db().accounts).map(([acc, a]) => ({ account: acc, name: a.name, main: a.main, locked: a.locked, frozen: a.frozen })));
  });

  r.post('/api/topup', auth, (req, res) => {
    const amount = Number(req.body.amount);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) return res.status(400).json({ error: 'Invalid amount' });
    req.acc.main += amount;
    note(req.acc, 'Loaded from bank (demo)', amount);
    res.json(view(req.username, req.acc));
  });

  r.post('/api/send', auth, (req, res) => {
    const a = req.acc;
    const toName = String(req.body.to || '').trim().toLowerCase();
    const to = db().accounts[toName];
    const amount = Number(req.body.amount);
    if (!to) return res.status(404).json({ error: `No ${partner.name} user "${toName}"` });
    if (toName === req.username) return res.status(400).json({ error: 'You cannot send to yourself' });
    if (a.frozen) return res.status(403).json({ error: 'Account frozen' });
    if (!Number.isInteger(amount) || amount <= 0 || amount > a.main) return res.status(400).json({ error: 'Invalid amount' });
    a.main -= amount; to.main += amount;
    note(a, `Sent to ${to.name}`, -amount);
    note(to, `Received from ${a.name}`, amount);
    res.json(view(req.username, a));
  });

  // ---- OfflinePay integration ----
  r.post('/api/offline/enable', auth, async (req, res) => {
    if (req.acc.frozen) return res.status(403).json({ error: 'Account frozen' });
    try {
      const { cert } = await offlinepay('/devices/register', { account: req.username, name: req.acc.name, pub: req.body.pub });
      note(req.acc, 'Offline Pay enabled on this phone', 0);
      res.json({ cert });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  r.post('/api/offline/load', auth, async (req, res) => {
    const a = req.acc;
    const amount = Number(req.body.amount);
    if (a.frozen) return res.status(403).json({ error: 'Account frozen' });
    if (!Number.isInteger(amount) || amount <= 0 || amount > a.main) return res.status(400).json({ error: 'Not enough balance' });
    try {
      // OfflinePay checks the device belongs to this wallet; the cert itself is bound to req.username.
      const { loadCert } = await offlinepay('/offline/load', { deviceId: req.body.deviceId, account: req.username, amount });
      a.main -= amount; a.locked += amount;  // money is locked in OUR ledger; OfflinePay never holds it
      note(a, 'Moved to offline vault', -amount);
      res.json({ loadCert });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  r.post('/webhooks/offlinepay', (req, res) => {
    if (req.get('X-OfflinePay-Secret') !== partner.key) return res.status(401).end();
    const { event, data } = req.body;
    const a = db().accounts[data.account];
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

  // Rehearsal reset: keeps accounts and passwords, restores balances and clears history.
  r.post('/api/reset', (req, res) => {
    for (const a of Object.values(db().accounts)) {
      Object.assign(a, { main: OPENING_BALANCE, locked: 0, frozen: false, history: [] });
      note(a, 'Opening balance (demo money)', OPENING_BALANCE);
    }
    store.save();
    res.json({ ok: true });
  });

  return r;
}
