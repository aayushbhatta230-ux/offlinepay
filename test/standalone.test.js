// Standalone (phone-only) mode: two phones, each running its own copy of the engine, no server.
// They only exchange QR codes. Checks that payments settle and that double-spends are still caught.
import assert from 'node:assert/strict';
import { createEngine, initialState } from '../core/engine.js';
import { webPasswords } from '../core/passwords-web.js';
import { DEMO_ISSUER } from '../core/demo-issuer.js';
import * as P from '../sdk/protocol.js';

function phone() {
  const engine = createEngine({ state: initialState(), save() {}, passwords: webPasswords, mode: 'local', issuer: DEMO_ISSUER });
  const call = async (method, path, body, auth) => {
    const r = await engine.handle(method, path, { body, auth });
    if (r.status !== 200) throw Object.assign(new Error(r.body.error), { status: r.status });
    return r.body;
  };
  return { engine, call };
}

let passed = 0;
const ok = (name) => { passed++; console.log('  ✓', name); };

const customerPhone = phone();
const merchantPhone = phone();

// Accounts are created on each phone
const cust = await customerPhone.call('POST', '/paya/api/signup', { name: 'Customer One', username: 'customer', password: 'password-123' });
const merch = await merchantPhone.call('POST', '/payb/api/signup', { name: 'Tea Shop', username: 'teashop', password: 'password-456', type: 'merchant' });
assert.ok((await customerPhone.engine.state.wallets.paya.accounts.customer.passwordHash).startsWith('pbkdf2$'));
await assert.rejects(customerPhone.call('POST', '/paya/api/login', { username: 'customer', password: 'nope-nope' }), /Wrong/);
ok('accounts and passwords work on the phone with no server');

// Customer enables Offline Pay and loads Rs 1000
const keys = await P.generateKeyPair();
const { cert } = await customerPhone.call('POST', '/paya/api/offline/enable', { pub: await P.exportPublic(keys.publicKey) }, cust.token);
await customerPhone.call('POST', '/paya/api/offline/load', { deviceId: cert.deviceId, amount: 1000 }, cust.token);
await merchantPhone.call('POST', '/payb/api/offline/enable', { pub: await P.exportPublic((await P.generateKeyPair()).publicKey) }, merch.token);
assert.ok((await P.verifyCert(DEMO_ISSUER.pub, cert)).ok, "merchant phone can verify the customer phone's certificate");
ok("phones verify each other's certificates via the shared demo issuer");

const pay = async (amount, counter, prevHash) => P.signObject(keys.privateKey, {
  v: 1, type: 'pay', txId: P.randomId(12), cert,
  payee: { partner: 'payb', account: 'teashop', name: 'Tea Shop' },
  amount, counter, prevHash, nonce: P.randomId(9), ts: Date.now(),
});

const t1 = await pay(200, 1, null);
const t2 = await pay(900, 1, null); // rolled-back vault: same counter again
const t3 = await pay(100, 2, await P.hashToken(t1));

// Merchant phone reconnects and settles what it received (oldest first)
const m = await merchantPhone.call('POST', '/v1/sync', { deviceId: 'merchant-device', tokens: [t1, t2].map(P.encodeQR) });
assert.deepEqual(m.results.map((r) => r.status), ['settled', 'fraud']);
let merchMe = await merchantPhone.call('GET', '/payb/api/me', null, merch.token);
assert.equal(merchMe.main, 5200);
assert.ok(m.revocations.includes(cert.deviceId));
ok('merchant phone settles Rs 200 and catches the Rs 900 double-spend');

// Customer phone reconnects and settles its own sent payments
const c = await customerPhone.call('POST', '/v1/sync', { deviceId: cert.deviceId, tokens: [t1, t2, t3].map(P.encodeQR) });
assert.deepEqual(c.results.map((r) => r.status), ['settled', 'fraud', 'settled']);
const custMe = await customerPhone.call('GET', '/paya/api/me', null, cust.token);
assert.equal(custMe.frozen, true);
assert.equal(custMe.locked, 700); // 1000 loaded − 200 − 100 settled
assert.equal(c.device.status, 'frozen');
ok("customer phone debits its own settled payments and freezes itself for the double-spend");

// Tampered token rejected at settlement too
const bad = await merchantPhone.call('POST', '/v1/sync', { deviceId: 'merchant-device', tokens: [P.encodeQR({ ...t3, amount: 5000, txId: 'x' })] });
assert.equal(bad.results[0].status, 'rejected');
ok('tampered token rejected at settlement');

const state = await merchantPhone.call('GET', '/v1/admin/state');
assert.equal(state.mode, 'local');
assert.ok(state.txs.some((t) => t.status === 'fraud'));
ok('in-app console sees settlements and fraud');

console.log(`\n${passed} standalone checks passed`);
