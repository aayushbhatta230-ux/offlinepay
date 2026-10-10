// OfflinePay backend engine: the OfflinePay API (our product) plus the two mock partner wallets.
// Environment-agnostic (WebCrypto only), so the same code runs:
//   - on the laptop server (server/index.js wraps it in HTTP), and
//   - inside the phone app in standalone mode (apps/wallet/local-backend.js calls it directly).
//
// OfflinePay never holds money: it tells the partner wallets what to debit and credit.

import * as P from '../sdk/protocol.js';

export const PARTNERS = {
  paya: { name: 'PayA', key: 'paya_sk_demo_123' },
  payb: { name: 'PayB', key: 'payb_sk_demo_456' },
};

const DEVICE_LIMIT = 5000;               // max offline value per device (Rs)
const CERT_TTL = 30 * 24 * 3600 * 1000;  // device certificate valid for 30 days
const OPENING_BALANCE = 5000;            // demo money every new account starts with
const SESSION_TTL = 30 * 24 * 3600 * 1000;
const MAX_FAILS = 5;
const LOCK_MS = 60 * 1000;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const MIN_PASSWORD = 8;

export function initialState() {
  return {
    issuer: null, devices: {}, loads: {}, txs: {}, events: [], net: {},
    wallets: Object.fromEntries(Object.keys(PARTNERS).map((id) => [id, { accounts: {}, sessions: {} }])),
  };
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };

/**
 * @param {object} opts
 * @param {object} opts.state      mutable state object (see initialState)
 * @param {Function} opts.save     called after every change
 * @param {{hash: Function, verify: Function}} opts.passwords
 * @param {'server'|'local'} opts.mode   'local' = runs on a phone with no central server
 * @param {{pub, priv}} [opts.issuer]    fixed issuer key (local mode); otherwise generated and kept in state
 */
export function createEngine({ state, save, passwords, mode = 'server', issuer: fixedIssuer }) {
  const db = state;
  for (const id of Object.keys(PARTNERS)) db.wallets[id] ??= { accounts: {}, sessions: {} };
  const fails = new Map();
  let issuerPriv = null;

  async function issuer() {
    if (fixedIssuer) db.issuer = { pub: fixedIssuer.pub, priv: fixedIssuer.priv };
    if (!db.issuer) {
      const kp = await P.generateKeyPair(true);
      db.issuer = { pub: await P.exportPublic(kp.publicKey), priv: await P.exportPrivateJwk(kp.privateKey) };
      save();
    }
    if (!issuerPriv) issuerPriv = await P.importPrivateJwk(db.issuer.priv);
    return { pub: db.issuer.pub, priv: issuerPriv };
  }

  function log(kind, message, extra = {}) {
    db.events.unshift({ id: P.randomId(6), at: Date.now(), kind, message, ...extra });
    db.events.length = Math.min(db.events.length, 200);
  }

  // =====================================================================
  // OfflinePay core (what partners integrate)
  // =====================================================================

  async function registerDevice(partner, { account, name, pub }) {
    if (!account || !pub?.x || !pub?.y) fail(400, 'account and pub required');
    const deviceId = P.randomId(12);
    const now = Date.now();
    const cert = await P.signObject((await issuer()).priv, {
      v: P.VERSION, type: 'cert', deviceId, partner, account, name: name || account,
      pub, limit: DEVICE_LIMIT, iat: now, exp: now + CERT_TTL,
    });
    db.devices[deviceId] = { deviceId, partner, account, name: name || account, pub, status: 'active', loaded: 0, spent: 0, counters: {}, createdAt: now };
    log('device', `Device registered for ${name || account} (${PARTNERS[partner].name})`);
    save();
    return { cert };
  }

  async function loadDevice(partner, { deviceId, account, amount }) {
    const dev = db.devices[deviceId];
    if (!dev || dev.partner !== partner || (account && dev.account !== account)) fail(404, 'Unknown device');
    if (dev.status !== 'active') fail(403, 'Device is frozen');
    if (!Number.isInteger(amount) || amount <= 0) fail(400, 'Invalid amount');
    if (dev.loaded - dev.spent + amount > DEVICE_LIMIT) fail(400, `Offline limit is Rs ${DEVICE_LIMIT} per device`);
    const loadId = P.randomId(9);
    const loadCert = await P.signObject((await issuer()).priv, { type: 'load', loadId, deviceId, amount, iat: Date.now() });
    db.loads[loadId] = { loadId, deviceId, amount, at: Date.now() };
    dev.loaded += amount;
    log('load', `Rs ${amount} locked for offline use by ${dev.name} (${PARTNERS[dev.partner].name})`, { amount });
    save();
    return { loadCert };
  }

  function freezeDevice(partner, deviceId) {
    const dev = db.devices[deviceId];
    if (!dev || dev.partner !== partner) fail(404, 'Unknown device');
    dev.status = 'frozen';
    dev.frozenReason = 'Frozen by partner';
    log('device', `Device of ${dev.name} frozen by ${PARTNERS[partner].name}`);
    save();
    return { ok: true };
  }

  function webhook(partnerId, event, data) {
    log('webhook', `→ ${PARTNERS[partnerId].name}: ${event}`, { partner: partnerId, event });
    walletWebhook(partnerId, event, data);
  }

  async function settleToken(token, submittedBy) {
    const existing = db.txs[token.txId];
    if (existing) return { txId: token.txId, status: existing.status, reason: existing.reason };

    const { pub } = await issuer();
    const record = (status, reason) => {
      db.txs[token.txId] = {
        txId: token.txId, status, reason, amount: token.amount, counter: token.counter,
        deviceId: token.cert?.deviceId,
        payer: { partner: token.cert?.partner, account: token.cert?.account, name: token.cert?.name },
        payee: token.payee, signedAt: token.ts, settledAt: Date.now(), submittedBy, token,
      };
      return { txId: token.txId, status, reason };
    };

    const check = await P.verifyPayment(pub, token, token.ts); // cert must have been valid when signed
    if (!check.ok) {
      log('reject', `Rejected payment: ${check.reason}`);
      return record('rejected', check.reason);
    }

    let dev = db.devices[token.cert.deviceId];
    if (!dev) {
      if (mode !== 'local') return record('rejected', 'Unknown device');
      // Standalone mode: the payer's device was registered on another phone. Trust its signed certificate;
      // the spending limit is then enforced by the payer's own phone.
      const c = token.cert;
      dev = db.devices[c.deviceId] = { deviceId: c.deviceId, partner: c.partner, account: c.account, name: c.name, pub: c.pub, status: 'active', loaded: null, spent: 0, counters: {}, foreign: true, createdAt: Date.now() };
    }

    const fraud = (reason) => {
      dev.status = 'frozen';
      dev.frozenReason = reason;
      log('fraud', `🚩 FRAUD by ${dev.name} (${PARTNERS[dev.partner]?.name}): ${reason}`, { amount: token.amount });
      const r = record('fraud', reason);
      webhook(dev.partner, 'fraud.detected', { deviceId: dev.deviceId, account: dev.account, txId: token.txId, amount: token.amount, reason });
      webhook(token.payee.partner, 'settlement.rejected', { account: token.payee.account, txId: token.txId, amount: token.amount, reason });
      return r;
    };

    // 1. Each counter value may be used once. A reused counter = cloned/rolled-back vault.
    const prior = dev.counters[token.counter];
    if (prior && prior !== token.txId) return fraud(`Double-spend: counter #${token.counter} was already used by another payment`);

    // 2. Hash chain: if we know the previous payment, this one must point at it.
    const prevTxId = dev.counters[token.counter - 1];
    if (prevTxId && token.prevHash !== (await P.hashToken(db.txs[prevTxId].token))) {
      return fraud('Broken hash chain: payment history was altered');
    }

    // 3. Never spend more than was locked for this device (when we know how much was loaded).
    if (dev.loaded !== null && dev.spent + token.amount > dev.loaded) {
      return fraud(`Overspend: Rs ${dev.spent + token.amount} spent vs Rs ${dev.loaded} loaded`);
    }

    dev.counters[token.counter] = token.txId;
    dev.spent += token.amount;
    const r = record('settled');

    const from = token.cert.partner, to = token.payee.partner;
    if (from !== to) db.net[`${from}->${to}`] = (db.net[`${from}->${to}`] || 0) + token.amount;
    log('settle', `✅ Settled Rs ${token.amount}: ${token.cert.name} (${PARTNERS[from].name}) → ${token.payee.name} (${PARTNERS[to].name})`, { amount: token.amount });

    webhook(from, 'settlement.debit', { account: token.cert.account, txId: token.txId, amount: token.amount, to: token.payee });
    webhook(to, 'settlement.credit', { account: token.payee.account, txId: token.txId, amount: token.amount, from: { partner: from, account: token.cert.account, name: token.cert.name } });
    return r;
  }

  async function syncDevice({ deviceId, tokens = [] }) {
    const results = [];
    for (const raw of tokens) {
      let token;
      try { token = P.decodeQR(raw); } catch { continue; }
      results.push(await settleToken(token, deviceId));
    }
    save();
    const dev = db.devices[deviceId];
    return {
      results,
      device: dev && { status: dev.status, loaded: dev.loaded, spent: dev.spent },
      revocations: revocations(),
    };
  }

  const revocations = () => Object.values(db.devices).filter((d) => d.status === 'frozen').map((d) => d.deviceId);

  function adminState() {
    return {
      mode,
      partners: Object.fromEntries(Object.entries(PARTNERS).map(([id, p]) => [id, { name: p.name }])),
      devices: Object.values(db.devices).map(({ counters, pub, ...rest }) => rest),
      txs: Object.values(db.txs).map(({ token, ...rest }) => rest).sort((a, b) => b.settledAt - a.settledAt),
      events: db.events.slice(0, 60),
      net: db.net,
      ledgers: Object.fromEntries(Object.keys(PARTNERS).map((id) => [id, ledger(id)])),
    };
  }

  // Rehearsal reset: wipes OfflinePay data, keeps accounts/passwords, restores balances.
  function adminReset() {
    Object.assign(db, { devices: {}, loads: {}, txs: {}, events: [], net: {} });
    for (const id of Object.keys(PARTNERS)) {
      for (const a of Object.values(db.wallets[id].accounts)) {
        Object.assign(a, { main: OPENING_BALANCE, locked: 0, frozen: false, history: [] });
        note(a, 'Opening balance (demo money)', OPENING_BALANCE);
      }
    }
    log('device', 'Demo reset');
    save();
    return { ok: true };
  }

  // =====================================================================
  // Mock partner wallets (stand-ins for eSewa/Khalti-style backends)
  // =====================================================================

  const W = (id) => db.wallets[id];
  const note = (a, text, amount) => { a.history.unshift({ at: Date.now(), text, amount }); a.history.length = Math.min(a.history.length, 100); };
  const view = (acc, a) => ({ account: acc, name: a.name, type: a.type, main: a.main, locked: a.locked, frozen: a.frozen, history: a.history.slice(0, 40) });
  const ledger = (id) => Object.entries(W(id).accounts).map(([acc, a]) => ({ account: acc, name: a.name, main: a.main, locked: a.locked, frozen: a.frozen }));
  const tokenKey = (t) => P.sha256(t); // only a hash of the session token is stored

  async function createSession(id, account) {
    const token = P.randomId(32);
    W(id).sessions[await tokenKey(token)] = { account, expires: Date.now() + SESSION_TTL };
    return token;
  }

  async function sessionUser(id, token) {
    if (!token) fail(401, 'Please sign in again');
    const key = await tokenKey(token);
    const s = W(id).sessions[key];
    if (!s || s.expires < Date.now()) { if (s) delete W(id).sessions[key]; fail(401, 'Please sign in again'); }
    const acc = W(id).accounts[s.account];
    if (!acc) fail(401, 'Please sign in again');
    return { username: s.account, acc };
  }

  async function signup(id, body) {
    const name = String(body?.name || '').trim();
    const username = String(body?.username || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const type = body?.type === 'merchant' ? 'merchant' : 'personal';
    if (name.length < 2 || name.length > 40) fail(400, 'Enter your full name');
    if (!USERNAME_RE.test(username)) fail(400, 'Username: 3–20 lowercase letters, numbers or _');
    if (password.length < MIN_PASSWORD) fail(400, `Password must be at least ${MIN_PASSWORD} characters`);
    if (W(id).accounts[username]) fail(409, 'That username is taken');
    const a = { name, type, passwordHash: await passwords.hash(password), main: OPENING_BALANCE, locked: 0, frozen: false, history: [], createdAt: Date.now() };
    W(id).accounts[username] = a;
    note(a, 'Opening balance (demo money)', OPENING_BALANCE);
    const token = await createSession(id, username);
    save();
    return { token, me: view(username, a) };
  }

  async function login(id, body) {
    const username = String(body?.username || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const key = `${id}:${username}`;
    const f = fails.get(key);
    if (f && f.until > Date.now()) fail(429, `Too many attempts — try again in ${Math.ceil((f.until - Date.now()) / 1000)}s`);
    const a = W(id).accounts[username];
    if (!a || !(await passwords.verify(password, a.passwordHash))) {
      const g = f || { count: 0, until: 0 };
      if (++g.count >= MAX_FAILS) { g.until = Date.now() + LOCK_MS; g.count = 0; }
      fails.set(key, g);
      fail(401, 'Wrong username or password');
    }
    fails.delete(key);
    const token = await createSession(id, username);
    save();
    return { token, me: view(username, a) };
  }

  async function logout(id, token) {
    if (token) delete W(id).sessions[await tokenKey(token)];
    save();
    return { ok: true };
  }

  function topup({ acc, username }, body) {
    const amount = Number(body?.amount);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) fail(400, 'Invalid amount');
    acc.main += amount;
    note(acc, 'Loaded from bank (demo)', amount);
    save();
    return view(username, acc);
  }

  function send(id, { acc, username }, body) {
    const toName = String(body?.to || '').trim().toLowerCase();
    const to = W(id).accounts[toName];
    const amount = Number(body?.amount);
    if (!to) fail(404, `No ${PARTNERS[id].name} user "${toName}"`);
    if (toName === username) fail(400, 'You cannot send to yourself');
    if (acc.frozen) fail(403, 'Account frozen');
    if (!Number.isInteger(amount) || amount <= 0 || amount > acc.main) fail(400, 'Invalid amount');
    acc.main -= amount; to.main += amount;
    note(acc, `Sent to ${to.name}`, -amount);
    note(to, `Received from ${acc.name}`, amount);
    save();
    return view(username, acc);
  }

  async function walletEnableOffline(id, { acc, username }, body) {
    if (acc.frozen) fail(403, 'Account frozen');
    const res = await registerDevice(id, { account: username, name: acc.name, pub: body?.pub });
    note(acc, 'Offline Pay enabled on this phone', 0);
    save();
    return res;
  }

  async function walletLoadOffline(id, { acc, username }, body) {
    const amount = Number(body?.amount);
    if (acc.frozen) fail(403, 'Account frozen');
    if (!Number.isInteger(amount) || amount <= 0 || amount > acc.main) fail(400, 'Not enough balance');
    let res;
    try { res = await loadDevice(id, { deviceId: body?.deviceId, account: username, amount }); }
    catch (e) { fail(400, e.message); }
    acc.main -= amount; acc.locked += amount; // money is locked in the WALLET's ledger, not by OfflinePay
    note(acc, 'Moved to offline vault', -amount);
    save();
    return res;
  }

  function walletWebhook(id, event, data) {
    const a = W(id).accounts[data.account];
    if (!a) return; // account lives on another phone (standalone mode) — nothing to update here
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
  }

  function walletReset(id) {
    for (const a of Object.values(W(id).accounts)) {
      Object.assign(a, { main: OPENING_BALANCE, locked: 0, frozen: false, history: [] });
      note(a, 'Opening balance (demo money)', OPENING_BALANCE);
    }
    save();
    return { ok: true };
  }

  // =====================================================================
  // Router: same paths as the HTTP API
  // =====================================================================

  const partnerFromKey = (auth) => {
    const id = Object.keys(PARTNERS).find((p) => PARTNERS[p].key === auth);
    if (!id) fail(401, 'Invalid partner key');
    return id;
  };

  async function route(method, path, body, auth) {
    const [pathname, query = ''] = path.split('?');
    const seg = pathname.split('/').filter(Boolean);

    if (seg[0] === 'v1') {
      const r = seg.slice(1).join('/');
      if (method === 'GET' && r === 'issuer') return { pub: (await issuer()).pub };
      if (method === 'POST' && r === 'devices/register') return registerDevice(partnerFromKey(auth), body || {});
      if (method === 'POST' && r === 'offline/load') return loadDevice(partnerFromKey(auth), body || {});
      if (method === 'POST' && seg[1] === 'devices' && seg[3] === 'freeze') return freezeDevice(partnerFromKey(auth), seg[2]);
      if (method === 'POST' && r === 'sync') return syncDevice(body || {});
      if (method === 'GET' && r === 'revocations') return revocations();
      if (method === 'GET' && seg[1] === 'settlement' && seg[2]) {
        const tx = db.txs[seg[2]];
        if (!tx) fail(404, 'Unknown transaction');
        return { txId: tx.txId, status: tx.status, reason: tx.reason };
      }
      if (method === 'GET' && r === 'admin/state') return adminState();
      if (method === 'POST' && r === 'admin/reset') return adminReset();
      fail(404, 'Not found');
    }

    const id = seg[0];
    if (PARTNERS[id] && seg[1] === 'api') {
      const r = seg.slice(2).join('/');
      if (method === 'POST' && r === 'signup') return signup(id, body);
      if (method === 'POST' && r === 'login') return login(id, body);
      if (method === 'POST' && r === 'logout') return logout(id, auth);
      if (method === 'GET' && r === 'ledger') return ledger(id);
      if (method === 'POST' && r === 'reset') return walletReset(id);
      const user = await sessionUser(id, auth);
      if (method === 'GET' && r === 'me') return view(user.username, user.acc);
      if (method === 'POST' && r === 'topup') return topup(user, body);
      if (method === 'POST' && r === 'send') return send(id, user, body);
      if (method === 'POST' && r === 'offline/enable') return walletEnableOffline(id, user, body);
      if (method === 'POST' && r === 'offline/load') return walletLoadOffline(id, user, body);
    }
    void query;
    fail(404, 'Not found');
  }

  return {
    /** Handle one API request. `auth` is the bearer token (session or partner key). */
    async handle(method, path, { body, auth } = {}) {
      try {
        return { status: 200, body: await route(method, path, body, auth) };
      } catch (e) {
        if (e instanceof HttpError) return { status: e.status, body: { error: e.message } };
        console.error(e);
        return { status: 500, body: { error: 'Internal error' } };
      }
    },
    state: db,
  };
}
