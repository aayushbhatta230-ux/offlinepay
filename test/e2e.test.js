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

const PASSWORD = 'correct-horse-9';
const tokens = {};

const post = async (url, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + url, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
const get = async (url, token) => (await fetch(BASE + url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })).json();
const status = async (url, token) => (await fetch(BASE + url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })).status;

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE + '/v1/issuer'); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('server did not start');
}

async function signup(wallet, username, name, type = 'personal') {
  const r = await post(`/${wallet}/api/signup`, { name, username, password: PASSWORD, type });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  tokens[`${wallet}:${username}`] = r.body.token;
}

async function makeDevice(wallet, account) {
  const keys = await P.generateKeyPair();
  const pub = await P.exportPublic(keys.publicKey);
  const { body } = await post(`/${wallet}/api/offline/enable`, { pub }, tokens[`${wallet}:${account}`]);
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

const sync = async (dev, toks) => (await post('/v1/sync', { deviceId: dev.cert.deviceId, tokens: toks.map(P.encodeQR) })).body;
const me = (wallet, account) => get(`/${wallet}/api/me`, tokens[`${wallet}:${account}`]);
const tick = (ms = 150) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
const ok = (name) => { passed++; console.log('  ✓', name); };

try {
  await waitForServer();
  const { pub: issuerPub } = await get('/v1/issuer');

  // ---------- accounts & login ----------
  await signup('paya', 'aarav', 'Aarav Shrestha');
  await signup('payb', 'teahouse', 'Himalaya Tea House', 'merchant');
  await signup('paya', 'lodge', 'Sagarmatha Lodge', 'merchant');
  assert.equal((await post('/paya/api/signup', { name: 'Someone', username: 'aarav', password: PASSWORD })).status, 409);
  assert.equal((await post('/paya/api/signup', { name: 'Short', username: 'shorty', password: '123' })).status, 400);
  assert.equal((await post('/paya/api/signup', { name: 'Bad', username: 'Has Spaces', password: PASSWORD })).status, 400);
  ok('sign-up validates input and rejects taken usernames');

  await tick(200);
  const raw = fs.readFileSync(path.join(dataDir, 'wallet-paya.json'), 'utf8');
  assert.ok(!raw.includes(PASSWORD), 'plain password must not be stored');
  assert.ok(raw.includes('scrypt$'));
  ok('passwords stored only as scrypt hashes');

  const good = await post('/paya/api/login', { username: 'aarav', password: PASSWORD });
  assert.equal(good.status, 200); assert.ok(good.body.token);
  assert.equal((await post('/paya/api/login', { username: 'aarav', password: 'wrong-password' })).status, 401);
  assert.equal((await post('/paya/api/login', { username: 'nobody', password: PASSWORD })).status, 401);
  ok('login works with the right password, fails otherwise');

  assert.equal(await status('/paya/api/me'), 401);
  assert.equal(await status('/paya/api/me', 'forged-token'), 401);
  assert.equal(await status('/paya/api/me', tokens['payb:teahouse']), 401); // PayB session is useless on PayA
  ok('wallet APIs require a valid session for that wallet');

  await post('/paya/api/logout', {}, good.body.token);
  assert.equal(await status('/paya/api/me', good.body.token), 401);
  ok('logout revokes the session');

  for (let i = 0; i < 5; i++) await post('/paya/api/login', { username: 'lodge', password: 'guess' + i });
  assert.equal((await post('/paya/api/login', { username: 'lodge', password: PASSWORD })).status, 429);
  ok('5 wrong passwords lock the username');

  // ---------- devices & loading ----------
  const aarav = await makeDevice('paya', 'aarav');
  const teahouse = await makeDevice('payb', 'teahouse');
  const lodge = await makeDevice('paya', 'lodge');
  assert.ok((await P.verifyCert(issuerPub, aarav.cert)).ok);
  assert.equal(aarav.cert.account, 'aarav');
  ok('devices registered to the signed-in account with signed certificates');

  const steal = await post('/paya/api/offline/load', { deviceId: aarav.cert.deviceId, amount: 100 }, tokens['paya:lodge']);
  assert.equal(steal.status, 400);
  ok("a user cannot load money onto another user's device");

  const { body: load } = await post('/paya/api/offline/load', { deviceId: aarav.cert.deviceId, amount: 1000 }, tokens['paya:aarav']);
  assert.ok(await P.verifyObject(issuerPub, load.loadCert));
  aarav.balance += 1000;
  let a = await me('paya', 'aarav');
  assert.equal(a.main, 4000); assert.equal(a.locked, 1000);
  ok('load: Rs 1000 locked in PayA ledger, load certificate signed');

  const tooMuch = await post('/paya/api/offline/load', { deviceId: aarav.cert.deviceId, amount: 4500 }, tokens['paya:aarav']);
  assert.equal(tooMuch.status, 400);
  ok('offline limit enforced (Rs 5000 per device)');

  // ---------- offline: Aarav (PayA) pays Himalaya Tea House (PayB) Rs 200 ----------
  const snapshot = structuredClone({ counter: aarav.counter, lastHash: aarav.lastHash, balance: aarav.balance });
  const t1 = await pay(aarav, request('payb', 'teahouse', 'Himalaya Tea House', 200));
  assert.ok((await P.verifyPayment(issuerPub, t1)).ok);
  ok('payee verifies the payment offline');

  const tv = await P.verifyPayment(issuerPub, { ...t1, amount: 2000 });
  assert.equal(tv.ok, false); assert.match(tv.reason, /signature/i);
  ok('tampered amount fails signature check');

  const fakeKeys = await P.generateKeyPair();
  const fakeCert = await P.signObject(fakeKeys.privateKey, { ...aarav.cert, pub: await P.exportPublic(fakeKeys.publicKey) });
  const forged = await P.signObject(fakeKeys.privateKey, { ...t1, cert: fakeCert, txId: P.randomId() });
  assert.equal((await P.verifyPayment(issuerPub, forged)).ok, false);
  ok('forged device certificate rejected');

  // ---------- double-spend: roll back the vault, pay the lodge with the same money ----------
  Object.assign(aarav, snapshot);
  const t2 = await pay(aarav, request('paya', 'lodge', 'Sagarmatha Lodge', 900));
  assert.equal(t2.counter, t1.counter);
  assert.ok((await P.verifyPayment(issuerPub, t2)).ok, 'looks valid offline — that is the point');
  ok('double-spend looks valid offline (expected)');

  // ---------- back online: tea house syncs first ----------
  let s = await sync(teahouse, [t1]);
  assert.equal(s.results[0].status, 'settled');
  s = await sync(teahouse, [t1]);
  assert.equal(s.results[0].status, 'settled');
  await tick();
  assert.equal((await me('payb', 'teahouse')).main, 5200);
  ok('settlement: tea house credited Rs 200 once (idempotent resync)');

  s = await sync(lodge, [t2]);
  assert.equal(s.results[0].status, 'fraud');
  assert.match(s.results[0].reason, /Double-spend/);
  assert.ok(s.revocations.includes(aarav.cert.deviceId));
  await tick();
  a = await me('paya', 'aarav');
  assert.equal(a.frozen, true); assert.equal(a.locked, 800);
  assert.equal((await me('paya', 'lodge')).main, 5000);
  ok('double-spend detected, payer device + account frozen, lodge not credited');

  const after = await post('/paya/api/offline/load', { deviceId: aarav.cert.deviceId, amount: 100 }, tokens['paya:aarav']);
  assert.equal(after.status, 403);
  ok('frozen account cannot load more');

  const state = await get('/v1/admin/state');
  assert.equal(state.net['paya->payb'], 200);
  ok('inter-wallet net position: PayA owes PayB Rs 200');

  // ---------- rehearsal reset keeps accounts ----------
  await post('/paya/api/reset', {});
  const relog = await post('/paya/api/login', { username: 'aarav', password: PASSWORD });
  assert.equal(relog.status, 200);
  assert.equal(relog.body.me.main, 5000); assert.equal(relog.body.me.frozen, false);
  ok('demo reset restores balances but keeps accounts and passwords');

  console.log(`\n${passed} checks passed`);
} catch (e) {
  console.error('\n✗ FAILED:', e);
  process.exitCode = 1;
} finally {
  server.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
