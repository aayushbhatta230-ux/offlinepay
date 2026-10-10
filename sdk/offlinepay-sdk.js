// OfflinePay SDK — embedded by a partner wallet inside its app.
//
//   const op = new OfflinePay({
//     partner: 'paya', account: 'aarav',
//     registerDevice: (pub) => walletBackend.enableOffline(pub),   // returns device cert
//     requestLoad: (deviceId, amount) => walletBackend.load(...),   // returns load cert
//   });
//   await op.enable();  await op.load(2000);
//   const qr = await op.pay(requestQR);   const result = await op.receive(paymentQR);
//
// NOTE (demo): the vault lives in IndexedDB and is enforced in software. In production the
// balance and counter live in secure hardware (StrongBox / Secure Enclave).

import * as P from './protocol.js';

const STORES = ['kv', 'tx', 'requests'];

function openDB(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('kv');
      db.createObjectStore('tx', { keyPath: 'txId' });
      db.createObjectStore('requests', { keyPath: 'nonce' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idb(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

export class OfflinePay {
  // `transport(path, body)` replaces HTTP when the OfflinePay backend runs in-process (standalone demo mode).
  constructor({ partner, account, apiBase = '', transport, registerDevice, requestLoad, onChange }) {
    this.partner = partner;
    this.account = account;
    this.apiBase = apiBase;
    this.transport = transport;
    this.registerDevice = registerDevice;
    this.requestLoad = requestLoad;
    this.onChange = onChange || (() => {});
    this.simulateOffline = false;
    this._dbp = openDB(`offlinepay:${partner}:${account}`);
    this._syncing = null;
    addEventListener('online', () => this.sync().catch(() => {}));
  }

  // ---------- storage helpers ----------
  async _get(key) { return idb(await this._dbp, 'kv', 'readonly', (s) => s.get(key)); }
  async _put(key, val) { return idb(await this._dbp, 'kv', 'readwrite', (s) => s.put(val, key)); }
  async _vault() { return this._get('vault'); }
  async _saveVault(v) { await this._put('vault', v); }
  async _putTx(tx) { await idb(await this._dbp, 'tx', 'readwrite', (s) => s.put(tx)); }
  async _getTx(id) { return idb(await this._dbp, 'tx', 'readonly', (s) => s.get(id)); }
  async transactions() {
    const all = await idb(await this._dbp, 'tx', 'readonly', (s) => s.getAll());
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  isOnline() { return navigator.onLine && !this.simulateOffline; }

  async _api(path, body) {
    if (!this.isOnline()) throw new Error('No internet connection');
    if (this.transport) return this.transport(path, body);
    const res = await fetch(this.apiBase + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ---------- public state ----------
  async state() {
    const v = await this._vault();
    if (!v) return { enabled: false };
    return {
      enabled: true,
      deviceId: v.cert.deviceId,
      balance: v.balance,
      counter: v.counter,
      limit: v.cert.limit,
      expires: v.cert.exp,
      frozen: !!v.frozen,
      lastSync: v.lastSync || null,
    };
  }

  // ---------- setup (online) ----------
  async enable() {
    if (await this._vault()) return this.state();
    const { pub: issuerPub } = await this._api('/v1/issuer');
    const keys = await P.generateKeyPair(false); // private key can never leave the device
    const pub = await P.exportPublic(keys.publicKey);
    const cert = await this.registerDevice(pub);
    if (!(await P.verifyCert(issuerPub, cert)).ok) throw new Error('Received an invalid device certificate');
    await this._put('keys', keys);
    await this._saveVault({ cert, issuerPub, balance: 0, counter: 0, lastHash: null, loads: [], revoked: [] });
    this.onChange();
    return this.state();
  }

  async load(amount) {
    const v = await this._vault();
    if (!v) throw new Error('Offline Pay is not enabled');
    if (!this.isOnline()) throw new Error('Loading the vault needs an internet connection');
    const loadCert = await this.requestLoad(v.cert.deviceId, amount);
    if (!(await P.verifyObject(v.issuerPub, loadCert)) || loadCert.deviceId !== v.cert.deviceId) {
      throw new Error('Received an invalid load certificate');
    }
    if (v.loads.includes(loadCert.loadId)) return this.state();
    v.loads.push(loadCert.loadId);
    v.balance += loadCert.amount;
    await this._saveVault(v);
    this.onChange();
    return this.state();
  }

  // ---------- payee: create a request (works offline) ----------
  async createRequest(amount, payeeName) {
    const v = await this._vault();
    if (!v) throw new Error('Offline Pay is not enabled');
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Enter a valid amount');
    const req = {
      v: P.VERSION, type: 'req',
      payee: { partner: this.partner, account: this.account, name: payeeName },
      amount, nonce: P.randomId(9), ts: Date.now(),
    };
    await idb(await this._dbp, 'requests', 'readwrite', (s) => s.put({ ...req, used: false }));
    return P.encodeQR(req);
  }

  // Payer side: read a request before approving it.
  parseRequest(qrText) {
    const req = P.decodeQR(qrText);
    if (req.type !== 'req' || !Number.isInteger(req.amount) || req.amount <= 0 || !req.payee) {
      throw new Error('This is not a valid payment request');
    }
    return req;
  }

  // ---------- payer: sign a payment (works offline) ----------
  async pay(requestQR) {
    const req = this.parseRequest(requestQR);
    const v = await this._vault();
    if (!v) throw new Error('Offline Pay is not enabled');
    if (v.frozen) throw new Error('This device has been frozen by your wallet');
    if (v.cert.exp < Date.now()) throw new Error('Offline certificate expired — go online to renew');
    if (req.payee.partner === this.partner && req.payee.account === this.account) throw new Error('You cannot pay yourself');
    if (req.amount > v.balance) throw new Error(`Not enough offline balance (Rs ${v.balance})`);

    const keys = await this._get('keys');
    const token = await P.signObject(keys.privateKey, {
      v: P.VERSION, type: 'pay',
      txId: P.randomId(12),
      cert: v.cert,
      payee: req.payee,
      amount: req.amount,
      counter: v.counter + 1,
      prevHash: v.lastHash,
      nonce: req.nonce,
      ts: Date.now(),
    });

    v.counter = token.counter;
    v.lastHash = await P.hashToken(token);
    v.balance -= token.amount;
    await this._saveVault(v);
    await this._putTx({
      txId: token.txId, dir: 'out', token, amount: token.amount,
      counterparty: req.payee.name || req.payee.account, partner: req.payee.partner,
      status: 'pending', createdAt: Date.now(),
    });
    this.onChange();
    return P.encodeQR(token);
  }

  // ---------- payee: verify a payment (works offline) ----------
  async receive(paymentQR) {
    const v = await this._vault();
    if (!v) throw new Error('Offline Pay is not enabled');
    let token;
    try { token = P.decodeQR(paymentQR); } catch { return { ok: false, reason: 'Not an OfflinePay code' }; }

    const check = await P.verifyPayment(v.issuerPub, token);
    if (!check.ok) return check;
    if (token.payee.partner !== this.partner || token.payee.account !== this.account) {
      return { ok: false, reason: 'This payment is addressed to someone else' };
    }
    if (v.revoked.includes(token.cert.deviceId)) return { ok: false, reason: 'Payer device has been frozen for fraud' };

    const db = await this._dbp;
    const req = await idb(db, 'requests', 'readonly', (s) => s.get(token.nonce));
    if (!req) return { ok: false, reason: 'No matching request — possible replay of an old payment' };
    if (req.used) return { ok: false, reason: 'This payment was already received (replay blocked)' };
    if (req.amount !== token.amount) return { ok: false, reason: 'Amount does not match your request' };

    await idb(db, 'requests', 'readwrite', (s) => s.put({ ...req, used: true }));
    await this._putTx({
      txId: token.txId, dir: 'in', token, amount: token.amount,
      counterparty: token.cert.name || token.cert.account, partner: token.cert.partner,
      status: 'pending', createdAt: Date.now(),
    });
    this.onChange();
    return { ok: true, amount: token.amount, payer: token.cert.name || token.cert.account, payerPartner: token.cert.partner, txId: token.txId };
  }

  // ---------- settlement (online) ----------
  sync() {
    if (!this._syncing) this._syncing = this._doSync().finally(() => { this._syncing = null; });
    return this._syncing;
  }

  async _doSync() {
    const v = await this._vault();
    if (!v || !this.isOnline()) return null;
    // Oldest first: if two payments conflict, the one that happened first is the one that settles.
    const pending = (await this.transactions()).filter((t) => t.status === 'pending').reverse();
    const res = await this._api('/v1/sync', {
      deviceId: v.cert.deviceId,
      tokens: pending.map((t) => P.encodeQR(t.token)),
    });
    for (const r of res.results) {
      const tx = await this._getTx(r.txId);
      if (tx && tx.status !== r.status) await this._putTx({ ...tx, status: r.status, reason: r.reason, syncedAt: Date.now() });
    }
    const fresh = await this._vault();
    fresh.revoked = res.revocations || [];
    fresh.frozen = res.device?.status === 'frozen';
    fresh.lastSync = Date.now();
    await this._saveVault(fresh);
    this.onChange();
    return res;
  }

  // Wipes all OfflinePay data on this device (keys, vault, history).
  async destroy() {
    (await this._dbp).close();
    await new Promise((resolve) => {
      const r = indexedDB.deleteDatabase(`offlinepay:${this.partner}:${this.account}`);
      r.onsuccess = r.onerror = r.onblocked = () => resolve();
    });
  }

  // ---------- demo-only attack tools (shows why the backend checks matter) ----------
  debug = {
    snapshot: async () => { await this._put('snapshot', await this._vault()); },
    hasSnapshot: async () => !!(await this._get('snapshot')),
    // Restores the vault to an earlier state = cloning the balance to spend it twice.
    rollback: async () => {
      const snap = await this._get('snapshot');
      if (!snap) throw new Error('No snapshot saved');
      const cur = await this._vault();
      await this._saveVault({ ...snap, revoked: cur.revoked, lastSync: cur.lastSync });
      this.onChange();
    },
    // Changes the amount inside a signed token without re-signing it.
    tamper: (paymentQR, newAmount) => {
      const t = P.decodeQR(paymentQR);
      t.amount = newAmount;
      return P.encodeQR(t);
    },
  };
}
