// OfflinePay cloud API — the product we sell to wallets.
// Issues device + load certificates, verifies offline tokens, settles, and catches fraud.
// It never holds money: it tells partner wallets (via webhooks) what to debit and credit.

import express from 'express';
import * as P from '../sdk/protocol.js';
import { createStore } from './db.js';

const DEVICE_LIMIT = 5000;               // max offline value per device (Rs)
const CERT_TTL = 30 * 24 * 3600 * 1000;  // device certificate valid for 30 days

export const PARTNERS = {
  paya: { name: 'PayA', key: 'paya_sk_demo_123', webhook: '/paya/webhooks/offlinepay' },
  payb: { name: 'PayB', key: 'payb_sk_demo_456', webhook: '/payb/webhooks/offlinepay' },
};

const store = createStore('offlinepay', () => ({
  issuer: null, devices: {}, loads: {}, txs: {}, events: [], net: {},
}));
const db = () => store.data;

let issuerPriv = null;
async function issuer() {
  if (!db().issuer) {
    const kp = await P.generateKeyPair(true);
    db().issuer = { pub: await P.exportPublic(kp.publicKey), priv: await P.exportPrivateJwk(kp.privateKey) };
    store.save();
  }
  if (!issuerPriv) issuerPriv = await P.importPrivateJwk(db().issuer.priv);
  return { pub: db().issuer.pub, priv: issuerPriv };
}

function log(kind, message, extra = {}) {
  db().events.unshift({ id: P.randomId(6), at: Date.now(), kind, message, ...extra });
  db().events.length = Math.min(db().events.length, 200);
  store.save();
}

let baseUrl = '';
export function setBaseUrl(url) { baseUrl = url; }

async function webhook(partnerId, event, data) {
  const partner = PARTNERS[partnerId];
  log('webhook', `→ ${partner.name}: ${event}`, { partner: partnerId, event, data });
  try {
    await fetch(baseUrl + partner.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OfflinePay-Secret': partner.key },
      body: JSON.stringify({ event, data }),
    });
  } catch (e) {
    log('error', `Webhook to ${partner.name} failed: ${e.message}`);
  }
}

function partnerAuth(req, res, next) {
  const id = Object.keys(PARTNERS).find((p) => PARTNERS[p].key === req.get('Authorization')?.replace('Bearer ', ''));
  if (!id) return res.status(401).json({ error: 'Invalid partner key' });
  req.partner = id;
  next();
}

// ---------- settlement core ----------

async function settleToken(token, submittedBy) {
  const existing = db().txs[token.txId];
  if (existing) return { txId: token.txId, status: existing.status, reason: existing.reason };

  const { pub } = await issuer();
  const record = (status, reason) => {
    db().txs[token.txId] = {
      txId: token.txId, status, reason, amount: token.amount, counter: token.counter,
      deviceId: token.cert?.deviceId,
      payer: { partner: token.cert?.partner, account: token.cert?.account, name: token.cert?.name },
      payee: token.payee, signedAt: token.ts, settledAt: Date.now(), submittedBy, token,
    };
    store.save();
    return { txId: token.txId, status, reason };
  };

  const check = await P.verifyPayment(pub, token, token.ts); // cert must have been valid when signed
  if (!check.ok) {
    log('reject', `Rejected tx ${token.txId}: ${check.reason}`);
    return record('rejected', check.reason);
  }

  const dev = db().devices[token.cert.deviceId];
  if (!dev) return record('rejected', 'Unknown device');

  const fraud = async (reason) => {
    dev.status = 'frozen';
    dev.frozenReason = reason;
    log('fraud', `🚩 FRAUD on device ${dev.deviceId.slice(0, 8)} (${dev.name}): ${reason}`, { amount: token.amount });
    const r = record('fraud', reason);
    await webhook(dev.partner, 'fraud.detected', { deviceId: dev.deviceId, account: dev.account, txId: token.txId, amount: token.amount, reason });
    await webhook(token.payee.partner, 'settlement.rejected', { account: token.payee.account, txId: token.txId, amount: token.amount, reason });
    return r;
  };

  // 1. Each counter value may be used once. A reused counter = cloned/rolled-back vault.
  const prior = dev.counters[token.counter];
  if (prior && prior !== token.txId) return fraud(`Double-spend: counter #${token.counter} was already used by another payment`);

  // 2. Hash chain: if we know the previous payment, this one must point at it.
  const prevTxId = dev.counters[token.counter - 1];
  if (prevTxId && token.prevHash !== (await P.hashToken(db().txs[prevTxId].token))) {
    return fraud('Broken hash chain: payment history was altered');
  }

  // 3. Never spend more than was locked for this device.
  if (dev.spent + token.amount > dev.loaded) return fraud(`Overspend: Rs ${dev.spent + token.amount} spent vs Rs ${dev.loaded} loaded`);

  dev.counters[token.counter] = token.txId;
  dev.spent += token.amount;
  const r = record('settled');

  const from = token.cert.partner, to = token.payee.partner;
  if (from !== to) {
    const key = `${from}->${to}`;
    db().net[key] = (db().net[key] || 0) + token.amount;
  }
  log('settle', `✅ Settled Rs ${token.amount}: ${token.cert.name} (${PARTNERS[from].name}) → ${token.payee.name} (${PARTNERS[to].name})`, { amount: token.amount });
  store.save();

  await webhook(from, 'settlement.debit', { account: token.cert.account, txId: token.txId, amount: token.amount, to: token.payee });
  await webhook(to, 'settlement.credit', { account: token.payee.account, txId: token.txId, amount: token.amount, from: { partner: from, account: token.cert.account, name: token.cert.name } });
  return r;
}

// ---------- routes ----------

export function offlinepayRouter() {
  const r = express.Router();
  r.use(express.json({ limit: '1mb' }));

  r.get('/issuer', async (req, res) => res.json({ pub: (await issuer()).pub }));

  // Partner backend registers a user's device → device certificate.
  r.post('/devices/register', partnerAuth, async (req, res) => {
    const { account, name, pub } = req.body || {};
    if (!account || !pub?.x || !pub?.y) return res.status(400).json({ error: 'account and pub required' });
    const deviceId = P.randomId(12);
    const now = Date.now();
    const cert = await P.signObject((await issuer()).priv, {
      v: P.VERSION, type: 'cert', deviceId, partner: req.partner, account, name: name || account,
      pub, limit: DEVICE_LIMIT, iat: now, exp: now + CERT_TTL,
    });
    db().devices[deviceId] = {
      deviceId, partner: req.partner, account, name: name || account, pub,
      status: 'active', loaded: 0, spent: 0, counters: {}, createdAt: now,
    };
    log('device', `Device registered for ${name || account} (${PARTNERS[req.partner].name})`);
    res.json({ cert });
  });

  // Partner has locked funds in its ledger → load certificate the SDK adds to the vault.
  r.post('/offline/load', partnerAuth, async (req, res) => {
    const { deviceId, amount } = req.body || {};
    const dev = db().devices[deviceId];
    if (!dev || dev.partner !== req.partner) return res.status(404).json({ error: 'Unknown device' });
    if (dev.status !== 'active') return res.status(403).json({ error: 'Device is frozen' });
    if (!Number.isInteger(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (dev.loaded - dev.spent + amount > DEVICE_LIMIT) {
      return res.status(400).json({ error: `Offline limit is Rs ${DEVICE_LIMIT} per device` });
    }
    const loadId = P.randomId(9);
    const loadCert = await P.signObject((await issuer()).priv, { type: 'load', loadId, deviceId, amount, iat: Date.now() });
    db().loads[loadId] = { loadId, deviceId, amount, at: Date.now() };
    dev.loaded += amount;
    log('load', `Rs ${amount} locked for offline use by ${dev.name} (${PARTNERS[dev.partner].name})`, { amount });
    res.json({ loadCert });
  });

  r.post('/devices/:id/freeze', partnerAuth, (req, res) => {
    const dev = db().devices[req.params.id];
    if (!dev || dev.partner !== req.partner) return res.status(404).json({ error: 'Unknown device' });
    dev.status = 'frozen';
    dev.frozenReason = 'Frozen by partner';
    log('device', `Device of ${dev.name} frozen by ${PARTNERS[req.partner].name}`);
    res.json({ ok: true });
  });

  // SDK uploads tokens (sent or received) whenever it gets a connection. Idempotent.
  r.post('/sync', async (req, res) => {
    const { deviceId, tokens = [] } = req.body || {};
    const results = [];
    for (const raw of tokens) {
      let token;
      try { token = P.decodeQR(raw); } catch { continue; }
      results.push(await settleToken(token, deviceId));
    }
    const dev = db().devices[deviceId];
    res.json({
      results,
      device: dev && { status: dev.status, loaded: dev.loaded, spent: dev.spent },
      revocations: Object.values(db().devices).filter((d) => d.status === 'frozen').map((d) => d.deviceId),
    });
  });

  r.get('/revocations', (req, res) => {
    res.json(Object.values(db().devices).filter((d) => d.status === 'frozen').map((d) => d.deviceId));
  });

  r.get('/settlement/:txId', (req, res) => {
    const tx = db().txs[req.params.txId];
    if (!tx) return res.status(404).json({ error: 'Unknown transaction' });
    res.json({ txId: tx.txId, status: tx.status, reason: tx.reason });
  });

  // ---- demo dashboard ----
  r.get('/admin/state', (req, res) => {
    const d = db();
    res.json({
      partners: Object.fromEntries(Object.entries(PARTNERS).map(([id, p]) => [id, { name: p.name }])),
      devices: Object.values(d.devices).map(({ counters, pub, ...rest }) => rest),
      txs: Object.values(d.txs).map(({ token, ...rest }) => rest).sort((a, b) => b.settledAt - a.settledAt),
      events: d.events.slice(0, 60),
      net: d.net,
    });
  });

  r.post('/admin/reset', (req, res) => {
    store.reset({ issuer: db().issuer });
    log('device', 'Demo reset');
    res.json({ ok: true });
  });

  return r;
}
