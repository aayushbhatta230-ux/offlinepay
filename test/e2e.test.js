// End-to-end test: starts the server and plays the demo story using the raw protocol
// (a "device" here is just a key pair + vault object, like the SDK keeps in IndexedDB).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as P from '../sdk/protocol.js';

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'offlinepay-test-'));
const server = spawn(process.execPath, ['server/index.js'], {
  cwd: path.resolve(import.meta.dirname, '..'),
  env: { ...process.env, PORT: String(PORT), OFFLINEPAY_DATA: dataDir },
  stdio: 'pipe',
});

const post = async (url, body) => {
  const r = await fetch(BASE + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
const get = async (url) => (await fetch(BASE + url)).json();

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE + '/v1/issuer'); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('server did not start');
}

async function makeDevice(wallet, account) {
  const keys = await P.generateKeyPair();
  const pub = await P.exportPublic(keys.publicKey);
  const { body } = await post(`/${wallet}/api/offline/enable`, { account, pub });
  return { wallet, account, keys, cert: body.cert, balance: 0, counter: 0, lastHash: null };
}

async function pay(dev, request) {
  const token = await P.signObject(dev.keys.privateKey, {
    v: 1, type: 'pay', txId: P.randomId(12), cert: dev.cert, payee: request.payee,
    amount: request.amount, counter: dev.counter + 1, prevHash: dev.lastHash, nonce: request.nonce, ts: Date.now(),
  });
  dev.counter++; dev.lastHash = await P.hashToken(token); dev.balance -= token.amount;
  return token;
}

const request = (wallet, account, name, amount) =>
  ({ v: 1, type: 'req', payee: { partner: wallet, account, name }, amount, nonce: P.randomId(9), ts: Date.now() });

const sync = async (dev, tokens) => (await post('/v1/sync', { deviceId: dev.cert.deviceId, tokens: tokens.map(P.encodeQR) })).body;
const me = async (wallet, account) => get(`/${wallet}/api/me?account=${account}`);
const tick = () => new Promise((r) => setTimeout(r, 150));

let passed = 0;
const ok = (name) => { passed++; console.log('  ✓', name); };

try {
  await waitForServer();
  const { pub: issuerPub } = await get('/v1/issuer');

  const aarav = await makeDevice('paya', 'aarav');
  const teahouse = await makeDevice('payb', 'teahouse');
  const lodge = await makeDevice('paya', 'lodge');
  assert.ok((await P.verifyCert(issuerPub, aarav.cert)).ok);
  ok('devices registered with signed certificates');

  const { body: load } = await post('/paya/api/offline/load', { account: 'aarav', deviceId: aarav.cert.deviceId, amount: 1000 });
  assert.ok(await P.verifyObject(issuerPub, load.loadCert));
  aarav.balance += 1000;
  let a = await me('paya', 'aarav');
  assert.equal(a.main, 7000); assert.equal(a.locked, 1000);
  ok('load: Rs 1000 locked in PayA ledger, load certificate signed');

  const tooMuch = await post('/paya/api/offline/load', { account: 'aarav', deviceId: aarav.cert.deviceId, amount: 4500 });
  assert.equal(tooMuch.status, 400);
  ok('offline limit enforced (Rs 5000 per device)');

  // --- offline: Aarav (PayA) pays Himalaya Tea House (PayB) Rs 200
  const snapshot = structuredClone({ counter: aarav.counter, lastHash: aarav.lastHash, balance: aarav.balance });
  const req1 = request('payb', 'teahouse', 'Himalaya Tea House', 200);
  const t1 = await pay(aarav, req1);
  assert.ok((await P.verifyPayment(issuerPub, t1)).ok);
  ok('payee verifies the payment offline');

  const tampered = { ...t1, amount: 2000 };
  const tv = await P.verifyPayment(issuerPub, tampered);
  assert.equal(tv.ok, false); assert.match(tv.reason, /signature/i);
  ok('tampered amount fails signature check');

  // fake device: self-made cert not signed by OfflinePay
  const fakeKeys = await P.generateKeyPair();
  const fakeCert = await P.signObject(fakeKeys.privateKey, { ...aarav.cert, pub: await P.exportPublic(fakeKeys.publicKey) });
  const forged = await P.signObject(fakeKeys.privateKey, { ...t1, cert: fakeCert, txId: P.randomId() });
  assert.equal((await P.verifyPayment(issuerPub, forged)).ok, false);
  ok('forged device certificate rejected');

  // --- double-spend: roll back vault, pay the lodge with the same money
  Object.assign(aarav, snapshot);
  const t2 = await pay(aarav, request('paya', 'lodge', 'Sagarmatha Lodge', 900));
  assert.equal(t2.counter, t1.counter);
  assert.ok((await P.verifyPayment(issuerPub, t2)).ok, 'looks valid offline — that is the point');
  ok('double-spend looks valid offline (expected)');

  // --- back online: tea house syncs first
  let s = await sync(teahouse, [t1]);
  assert.equal(s.results[0].status, 'settled');
  s = await sync(teahouse, [t1]);
  assert.equal(s.results[0].status, 'settled');
  await tick();
  const th = await me('payb', 'teahouse');
  assert.equal(th.main, 1700);
  ok('settlement: tea house credited Rs 200 once (idempotent resync)');

  s = await sync(lodge, [t2]);
  assert.equal(s.results[0].status, 'fraud');
  assert.match(s.results[0].reason, /Double-spend/);
  assert.ok(s.revocations.includes(aarav.cert.deviceId));
  await tick();
  a = await me('paya', 'aarav');
  assert.equal(a.frozen, true); assert.equal(a.locked, 800);
  assert.equal((await me('paya', 'lodge')).main, 2000);
  ok('double-spend detected, payer device + account frozen, lodge not credited');

  const after = await post('/paya/api/offline/load', { account: 'aarav', deviceId: aarav.cert.deviceId, amount: 100 });
  assert.equal(after.status, 403);
  ok('frozen account cannot load more');

  const state = await get('/v1/admin/state');
  assert.equal(state.net['paya->payb'], 200);
  ok('inter-wallet net position: PayA owes PayB Rs 200');

  console.log(`\n${passed} checks passed`);
} catch (e) {
  console.error('\n✗ FAILED:', e);
  process.exitCode = 1;
} finally {
  server.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
