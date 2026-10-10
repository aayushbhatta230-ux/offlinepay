import { OfflinePay } from '/sdk/offlinepay-sdk.js';

// In the browser, the wallet comes from the URL (/paya/, /payb/) and the server is this origin.
// In the Android app (window.OPAY_NATIVE, set by scripts/build-www.js) both are chosen on a setup screen.
const NATIVE = !!window.OPAY_NATIVE;
const WALLET_NAMES = { paya: 'PayA', payb: 'PayB' };
const nativeConfig = (() => { try { return JSON.parse(localStorage.getItem('opay:config')) || {}; } catch { return {}; } })();
const WALLET = NATIVE ? nativeConfig.wallet : (location.pathname.split('/')[1] || 'paya');
const SERVER = NATIVE ? (nativeConfig.server || '').replace(/\/+$/, '') : '';
const BRAND = WALLET_NAMES[WALLET] || WALLET;
const API = `${SERVER}/${WALLET}/api`;
document.documentElement.dataset.wallet = WALLET;
document.title = `${BRAND} Wallet`;

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');

// ---------- small helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rs = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN');
const ago = (t) => {
  if (!t) return 'never';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return new Date(t).toLocaleString();
};
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(`${WALLET}:${k}`)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`${WALLET}:${k}`, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(`${WALLET}:${k}`); } catch {} },
};

let toastTimer;
function toast(msg) {
  $toast.textContent = msg;
  $toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $toast.hidden = true; }, 2800);
}

// ---------- state ----------
const S = {
  account: store.get('token') ? store.get('account') : null,
  token: store.get('token'),
  authMode: 'login',
  authError: '',
  me: null,
  op: null,
  opState: { enabled: false },
  txs: [],
  view: 'home',
  params: {},
  simOffline: false,
  tamper: false,
  demoOpen: false,
};

const online = () => navigator.onLine && !S.simOffline;

async function api(path, body) {
  if (!online()) throw new Error('No internet connection');
  const headers = body ? { 'Content-Type': 'application/json' } : {};
  if (S.token) headers.Authorization = `Bearer ${S.token}`;
  let res;
  try {
    res = await fetch(API + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error(NATIVE ? `Can't reach the server at ${SERVER}` : "Can't reach the server");
  }
  const data = await res.json();
  if (res.status === 401 && S.token) {
    // Session expired or was revoked: back to the sign-in screen (offline data stays on the phone).
    endSession();
    toast('Please sign in again');
    render();
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function startSession(token, me) {
  S.token = token;
  S.account = me.account;
  S.me = me;
  store.set('token', token);
  store.set('account', me.account);
  store.set(`${me.account}:me`, { ...me, cachedAt: Date.now() });
  setupSdk();
}

function endSession() {
  S.account = null; S.token = null; S.op = null; S.me = null;
  S.opState = { enabled: false }; S.txs = []; S.simOffline = false;
  S.view = 'home'; S.params = {};
  store.del('token');
  store.del('account');
}

function setupSdk() {
  S.op = new OfflinePay({
    partner: WALLET,
    account: S.account,
    apiBase: SERVER,
    // The wallet's own backend talks to OfflinePay with its secret partner key.
    // The signed-in session decides whose account this is; the app never names the account itself.
    registerDevice: async (pub) => (await api('/offline/enable', { pub })).cert,
    requestLoad: async (deviceId, amount) => (await api('/offline/load', { deviceId, amount })).loadCert,
    onChange: () => refreshLocal(),
  });
  S.simOffline = !!store.get(`${S.account}:simOffline`);
  S.op.simulateOffline = S.simOffline;
}

async function refreshLocal() {
  if (!S.op) return;
  S.opState = await S.op.state();
  S.txs = await S.op.transactions();
}

async function refreshRemote() {
  if (!S.account || !online()) return;
  try {
    const me = await api('/me');
    if (!S.account) return;
    S.me = me;
    store.set(`${S.account}:me`, { ...S.me, cachedAt: Date.now() });
  } catch {}
  try { await S.op?.sync(); } catch {}
}

function go(view, params = {}) {
  S.view = view;
  S.params = params;
  render();
  scrollTo(0, 0);
}

// ---------- QR + scanner ----------
function qrSvg(text) {
  const qr = qrcode(0, 'L');
  qr.addData(text, 'Byte');
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Code copied'); return; } catch {}
  const t = document.createElement('textarea');
  t.value = text; document.body.append(t); t.select();
  try { document.execCommand('copy'); toast('Code copied'); } catch { toast('Copy failed — select the text manually'); }
  t.remove();
}

function scan(hint) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'scanner';
    el.innerHTML = `
      <div class="hint"><strong>${esc(hint)}</strong></div>
      <video playsinline muted></video>
      <div class="hint" data-cam>Starting camera…</div>
      <textarea placeholder="No camera? Paste the code here (starts with OPAY1:)"></textarea>
      <button class="btn" data-use>Use pasted code</button>
      <button class="btn secondary" data-cancel>Cancel</button>`;
    document.body.append(el);
    const video = el.querySelector('video');
    const camMsg = el.querySelector('[data-cam]');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let stream = null, done = false;

    const finish = (val) => {
      if (done) return;
      done = true;
      stream?.getTracks().forEach((t) => t.stop());
      el.remove();
      resolve(val);
    };
    el.querySelector('[data-cancel]').onclick = () => finish(null);
    el.querySelector('[data-use]').onclick = () => {
      const v = el.querySelector('textarea').value.trim();
      if (v) finish(v); else toast('Paste a code first');
    };

    const tick = () => {
      if (done) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code?.data?.startsWith('OPAY1:')) { navigator.vibrate?.(60); return finish(code.data); }
      }
      requestAnimationFrame(tick);
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      camMsg.textContent = 'Camera needs HTTPS or localhost — paste the code instead.';
      video.hidden = true;
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        if (done) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s; video.srcObject = s; video.play();
        camMsg.textContent = 'Point the camera at the QR code';
        requestAnimationFrame(tick);
      })
      .catch(() => { camMsg.textContent = 'Camera unavailable — paste the code instead.'; video.hidden = true; });
  });
}

// ---------- views ----------
const netPill = () => `
  <button class="net-pill ${online() ? '' : 'off'}" data-action="toggleNet" title="Tap to simulate going offline">
    <span class="dot"></span>${online() ? 'Online' : 'Offline'}${S.simOffline ? ' (simulated)' : ''}
  </button>`;

const head = (title, back = 'home') => `
  <div class="page-head">
    <button class="back" data-action="go" data-view="${back}" aria-label="Back">←</button>
    <h2>${esc(title)}</h2>
    ${netPill()}
  </div>`;

const frozenBanner = () => (S.me?.frozen || S.opState.frozen)
  ? `<div class="banner bad">🚩 This account has been frozen after a fraud alert. Contact ${BRAND} support.</div>` : '';

const statusChip = (s) => ({
  pending: '<span class="chip pending">Pending settlement</span>',
  settled: '<span class="chip settled">Settled</span>',
  fraud: '<span class="chip fraud">Fraud — blocked</span>',
  rejected: '<span class="chip rejected">Rejected</span>',
}[s] || '');

const views = {
  // Android app only: choose which mock wallet this phone runs and where the demo server is.
  setup() {
    return `
      <div class="topbar" style="padding-bottom:24px"><div class="brand">OfflinePay demo</div><div class="hello">Set up this phone</div></div>
      <form class="panel" data-form="setup">
        <p>Run <strong>npm start</strong> on the laptop and connect this phone to the same Wi-Fi or hotspot. Then enter the laptop's address.</p>
        <label class="field"><span>Server address</span><input name="server" required inputmode="url" autocapitalize="off" autocorrect="off" placeholder="http://192.168.1.10:3000" value="${esc(nativeConfig.server || '')}"></label>
        <label class="field"><span>Wallet on this phone</span></label>
        <div class="btn-row">
          <button class="btn" name="wallet" value="paya" style="background:#5b3fd6">PayA</button>
          <button class="btn" name="wallet" value="payb" style="background:#e0631b">PayB</button>
        </div>
      </form>`;
  },

  login() {
    const signup = S.authMode === 'signup';
    return `
      <div class="topbar" style="padding-bottom:24px">
        <div class="row">
          <div><div class="brand">${BRAND}</div><div class="hello">${signup ? 'Create your account' : 'Sign in to your wallet'}</div></div>
          ${NATIVE ? '<button class="icon-btn" data-action="changeSetup" title="Change wallet or server">⚙</button>' : ''}
        </div>
      </div>
      <div class="tabs">
        <button class="${signup ? '' : 'on'}" data-action="authMode" data-mode="login">Sign in</button>
        <button class="${signup ? 'on' : ''}" data-action="authMode" data-mode="signup">Create account</button>
      </div>
      ${S.authError ? `<div class="banner bad">${esc(S.authError)}</div>` : ''}
      ${!online() ? '<div class="banner warn">You are offline. Signing in needs a connection.</div>' : ''}
      <form class="panel" data-form="${signup ? 'signup' : 'login'}">
        ${signup ? `<label class="field"><span>Full name</span><input name="name" required minlength="2" maxlength="40" autocomplete="name"></label>` : ''}
        <label class="field"><span>Username</span><input name="username" required autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="username"
          ${signup ? 'pattern="[a-z0-9_]{3,20}" title="3–20 lowercase letters, numbers or _"' : ''}></label>
        <label class="field"><span>Password</span><input name="password" type="password" required ${signup ? 'minlength="8" autocomplete="new-password"' : 'autocomplete="current-password"'}></label>
        ${signup ? `
          <label class="field"><span>Confirm password</span><input name="confirm" type="password" required minlength="8" autocomplete="new-password"></label>
          <label class="field"><span>Account type</span></label>
          <div class="btn-row" style="margin-bottom:4px">
            <label class="choice"><input type="radio" name="type" value="personal" checked> Personal</label>
            <label class="choice"><input type="radio" name="type" value="merchant"> Merchant / shop</label>
          </div>
          <p class="meta" style="margin:8px 0 0">New accounts start with Rs 5,000 of demo money.</p>` : ''}
        <button class="btn" ${online() ? '' : 'disabled'}>${signup ? 'Create account' : 'Sign in'}</button>
      </form>`;
  },

  home() {
    const me = S.me || {};
    const cached = !online() && me.cachedAt;
    return `
      <div class="topbar">
        <div class="row">
          <div><div class="brand">${BRAND}</div><div class="hello">Namaste, ${esc(me.name || S.account)}</div></div>
          <div class="row">${netPill()}<button class="icon-btn" data-action="logout" title="Sign out">⎋</button></div>
        </div>
      </div>
      <div class="balance-card">
        <div class="label">Wallet balance</div>
        <div class="amount">${rs(me.main)}</div>
        <div class="balance-split">
          <div><div class="label">Offline vault</div><div class="amount">${S.opState.enabled ? rs(S.opState.balance) : '—'}</div></div>
          <div><div class="label">Locked for offline</div><div class="amount">${rs(me.locked)}</div></div>
        </div>
        ${cached ? `<div class="stale">Offline · balance from ${ago(me.cachedAt)}</div>` : ''}
      </div>
      ${frozenBanner()}
      <div class="grid">
        <button class="tile hero" data-action="go" data-view="offline">
          <span class="ic">📡</span>
          <span><div class="t">Offline Pay</div><div class="s">Pay and get paid with no internet · powered by OfflinePay</div></span>
        </button>
        <button class="tile" data-action="go" data-view="topup"><span class="ic">➕</span>Load Money</button>
        <button class="tile" data-action="go" data-view="send"><span class="ic">↗</span>Send Money</button>
        <button class="tile" data-action="mock" data-name="Mobile top-up"><span class="ic">📱</span>Top-up</button>
        <button class="tile" data-action="mock" data-name="Bill payment"><span class="ic">🧾</span>Bills</button>
      </div>
      <div class="section">
        <h3>Wallet activity</h3>
        <div class="list">
          ${(me.history || []).slice(0, 12).map((h) => `
            <div class="item">
              <div class="main"><div class="title">${esc(h.text)}</div><div class="sub">${ago(h.at)}</div></div>
              ${h.amount ? `<div class="amt ${h.amount > 0 ? 'pos' : ''}">${h.amount > 0 ? '+' : '−'}${rs(Math.abs(h.amount))}</div>` : ''}
            </div>`).join('') || '<div class="empty">No activity yet</div>'}
        </div>
      </div>`;
  },

  offline() {
    const o = S.opState;
    if (!o.enabled) {
      return `${head('Offline Pay')}
        <div class="panel">
          <h3 style="margin-top:0">Pay without internet</h3>
          <p>Move money into a secure offline vault on this phone. You can then pay or receive by QR code even in airplane mode. Payments settle automatically when you're back online.</p>
          <p>This phone gets its own signing key that never leaves the device.</p>
          <button class="btn" data-action="enable" ${online() ? '' : 'disabled'}>Enable Offline Pay</button>
          ${online() ? '' : '<p class="meta" style="margin-top:8px">Needs internet once to set up.</p>'}
        </div>`;
    }
    const pending = S.txs.filter((t) => t.status === 'pending').length;
    return `${head('Offline Pay')}
      ${frozenBanner()}
      <div class="panel">
        <div class="vault">
          <div><div class="meta">Offline vault</div><div class="amount">${rs(o.balance)}</div></div>
          <div class="meta" style="text-align:right">Limit ${rs(o.limit)}<br>Device ${esc(o.deviceId.slice(0, 8))} · #${o.counter}</div>
        </div>
        <div class="btn-row" style="margin-top:14px">
          <button class="btn" data-action="startPay" ${o.frozen ? 'disabled' : ''}>Pay</button>
          <button class="btn" data-action="go" data-view="receive">Receive</button>
        </div>
        <button class="btn secondary" data-action="go" data-view="load" ${online() && !o.frozen ? '' : 'disabled'}>Load vault${online() ? '' : ' (needs internet)'}</button>
        <button class="btn secondary" data-action="sync" ${online() ? '' : 'disabled'}>Sync now${pending ? ` · ${pending} pending` : ''}</button>
        <div class="meta center" style="margin-top:8px">Last synced ${ago(o.lastSync)}</div>
      </div>
      <div class="section">
        <h3>Offline payments</h3>
        <div class="list">
          ${S.txs.map((t) => `
            <div class="item">
              <div class="main">
                <div class="title">${t.dir === 'out' ? 'Paid ' : 'Received from '}${esc(t.counterparty)}${t.partner !== WALLET ? ` <span class="meta">(${esc(WALLET_NAMES[t.partner] || t.partner)})</span>` : ''}</div>
                <div class="sub">${ago(t.createdAt)}${t.reason ? ' · ' + esc(t.reason) : ''}</div>
                ${statusChip(t.status)}
              </div>
              <div class="amt ${t.dir === 'in' ? 'pos' : ''} ${['fraud', 'rejected'].includes(t.status) ? 'void' : ''}">${t.dir === 'in' ? '+' : '−'}${rs(t.amount)}</div>
            </div>`).join('') || '<div class="empty">No offline payments yet</div>'}
        </div>
      </div>
      <details class="demo" ${S.demoOpen ? 'open' : ''}>
        <summary>Demo: attack tools</summary>
        <p class="meta" style="margin:8px 0 0">These simulate a hacked phone so you can show the system catching it.</p>
        <button class="btn danger" data-action="snapshot">1. Save vault snapshot</button>
        <button class="btn danger" data-action="rollback">2. Roll back vault (clone money)</button>
        <label class="toggle"><span>Tamper with next payment (×10 amount)</span><input type="checkbox" data-action="tamper" ${S.tamper ? 'checked' : ''}></label>
        <button class="btn secondary" data-action="resetPhone">Reset this phone</button>
      </details>`;
  },

  load() {
    return `${head('Load offline vault', 'offline')}
      <form class="panel" data-form="load">
        <p>Money moves from your ${BRAND} balance (${rs(S.me?.main)}) into this phone's offline vault.</p>
        <label class="field"><span>Amount</span><input class="big" name="amount" type="number" inputmode="numeric" min="1" step="1" value="1000" required></label>
        <button class="btn">Load vault</button>
      </form>`;
  },

  receive() {
    return `${head('Receive offline', 'offline')}
      <form class="panel" data-form="receive">
        <p>Create a payment request. The payer scans it, then shows you their payment code.</p>
        <label class="field"><span>Amount to receive</span><input class="big" name="amount" type="number" inputmode="numeric" min="1" step="1" placeholder="0" required autofocus></label>
        <button class="btn">Create request</button>
      </form>`;
  },

  receiveQR() {
    const { qr, amount } = S.params;
    return `${head('Show to payer', 'offline')}
      <div class="panel center">
        <div class="meta">Request</div>
        <div class="big-amt">${rs(amount)}</div>
        <div class="qr-wrap">${qrSvg(qr)}</div>
        <p style="margin-top:12px">Step 1: payer scans this code.<br>Step 2: scan the payer's code.</p>
        <button class="btn" data-action="scanPayment">Scan payer's code</button>
        <button class="btn secondary" data-action="copy">Copy request code</button>
      </div>`;
  },

  payConfirm() {
    const { req } = S.params;
    const after = S.opState.balance - req.amount;
    return `${head('Confirm payment', 'offline')}
      <div class="panel center">
        <div class="meta">Pay to</div>
        <h2 style="margin:4px 0">${esc(req.payee.name || req.payee.account)}</h2>
        <div class="meta">${esc(WALLET_NAMES[req.payee.partner] || req.payee.partner)} · @${esc(req.payee.account)}</div>
        <div class="big-amt">${rs(req.amount)}</div>
        <div class="meta">Vault after payment: ${rs(after)}</div>
        ${after < 0 ? '<div class="banner bad">Not enough offline balance</div>' : ''}
        <button class="btn" data-action="approvePay" ${after < 0 ? 'disabled' : ''}>Approve & sign</button>
        <button class="btn secondary" data-action="go" data-view="offline">Cancel</button>
      </div>`;
  },

  payQR() {
    const { qr, req, tampered } = S.params;
    return `${head('Show to merchant', 'offline')}
      <div class="panel center">
        <div class="meta">Signed payment to ${esc(req.payee.name)}</div>
        <div class="big-amt">${rs(req.amount)}</div>
        ${tampered ? '<div class="banner bad" style="margin:0 0 12px">⚠️ Tampered: amount changed after signing</div>' : ''}
        <div class="qr-wrap">${qrSvg(qr)}</div>
        <p style="margin-top:12px">Let ${esc(req.payee.name)} scan this code to receive the payment.</p>
        <button class="btn" data-action="go" data-view="offline">Done</button>
        <button class="btn secondary" data-action="copy">Copy payment code</button>
      </div>`;
  },

  result() {
    const p = S.params;
    return `${head(p.ok ? 'Payment received' : 'Payment failed', 'offline')}
      <div class="panel result ${p.ok ? 'ok' : 'bad'}">
        <div class="ic">${p.ok ? '✅' : '❌'}</div>
        <h2>${esc(p.title)}</h2>
        ${p.amount ? `<div class="big-amt">${rs(p.amount)}</div>` : ''}
        <p>${esc(p.sub)}</p>
        ${p.retry ? '<button class="btn" data-action="retryReceive">Back to request</button>' : ''}
        <button class="btn ${p.retry ? 'secondary' : ''}" data-action="go" data-view="offline">Done</button>
      </div>`;
  },

  topup() {
    return `${head('Load money')}
      <form class="panel" data-form="topup">
        <p>Add money from a linked bank (demo).</p>
        <label class="field"><span>Amount</span><input class="big" name="amount" type="number" inputmode="numeric" min="1" step="1" value="1000" required></label>
        <button class="btn" ${online() ? '' : 'disabled'}>Load money</button>
      </form>`;
  },

  send() {
    return `${head('Send money')}
      <form class="panel" data-form="send">
        <p>Online transfer to another ${BRAND} user.</p>
        <label class="field"><span>To (username)</span><input name="to" required placeholder="e.g. lodge"></label>
        <label class="field"><span>Amount</span><input class="big" name="amount" type="number" inputmode="numeric" min="1" step="1" required></label>
        <button class="btn" ${online() ? '' : 'disabled'}>Send</button>
      </form>`;
  },
};

let lastSig = '';
async function render() {
  if (NATIVE && !(WALLET && SERVER)) { $app.innerHTML = views.setup(); return; }
  if (!S.account) { $app.innerHTML = await views.login(); return; }
  const v = views[S.view] || views.home;
  $app.innerHTML = await v();
  lastSig = signature();
  const d = $app.querySelector('details.demo');
  if (d) d.addEventListener('toggle', () => { S.demoOpen = d.open; });
}

const signature = () => JSON.stringify([S.me, S.opState, S.txs.map((t) => [t.txId, t.status]), online()]);

// ---------- actions ----------
const actions = {
  go: (d) => go(d.view),
  mock: (d) => toast(`${d.name} — not part of this demo`),

  authMode(d) {
    S.authMode = d.mode;
    S.authError = '';
    render();
  },

  async logout() {
    if (!confirm('Sign out of this wallet? Offline Pay data stays on this phone for when you sign back in.')) return;
    if (online()) { try { await api('/logout', {}); } catch {} }
    endSession();
    go('home');
  },

  async toggleNet() {
    S.simOffline = !S.simOffline;
    S.op.simulateOffline = S.simOffline;
    store.set(`${S.account}:simOffline`, S.simOffline);
    toast(S.simOffline ? 'Simulated offline — no network calls' : 'Back online — syncing…');
    render();
    if (online()) { await refreshRemote(); await refreshLocal(); render(); }
  },

  async enable() {
    try {
      await S.op.enable();
      await refreshLocal();
      toast('Offline Pay enabled on this phone');
      go('load');
    } catch (e) { toast(e.message); }
  },

  async sync() {
    try {
      const res = await S.op.sync();
      await refreshRemote();
      await refreshLocal();
      const n = res?.results?.length || 0;
      toast(n ? `Synced ${n} payment${n > 1 ? 's' : ''}` : 'Up to date');
      render();
    } catch (e) { toast(e.message); }
  },

  async startPay() {
    const text = await scan("Scan the merchant's payment request");
    if (!text) return;
    try { go('payConfirm', { req: S.op.parseRequest(text) }); } catch (e) { toast(e.message); }
  },

  async approvePay() {
    const { req } = S.params;
    try {
      let qr = await S.op.pay(encodeReq(req));
      const tampered = S.tamper;
      if (tampered) { qr = S.op.debug.tamper(qr, req.amount * 10); S.tamper = false; }
      go('payQR', { qr, req, tampered });
    } catch (e) { toast(e.message); }
  },

  async scanPayment() {
    const text = await scan("Scan the payer's payment code");
    if (!text) return;
    const r = await S.op.receive(text);
    await refreshLocal();
    if (r.ok) {
      navigator.vibrate?.([40, 40, 80]);
      go('result', {
        ok: true, amount: r.amount, title: 'Signature verified',
        sub: `From ${r.payer}${r.payerPartner !== WALLET ? ` (${WALLET_NAMES[r.payerPartner] || r.payerPartner})` : ''}. Verified offline — it will settle when you're back online.`,
      });
      if (online()) S.op.sync().then(refreshLocal).catch(() => {});
    } else {
      go('result', { ok: false, title: 'Payment rejected', sub: r.reason, retry: S.view === 'receiveQR' ? S.params : null });
    }
  },

  retryReceive() { go('receiveQR', S.params.retry); },

  changeSetup() {
    try { localStorage.removeItem('opay:config'); } catch {}
    location.reload();
  },

  copy() { copyText(S.params.qr); },

  async snapshot() {
    await S.op.debug.snapshot();
    toast('Vault snapshot saved. Now make a payment.');
  },

  async rollback() {
    try {
      await S.op.debug.rollback();
      await refreshLocal();
      toast('Vault rolled back — the spent money is "back". Try paying someone else.');
      render();
    } catch (e) { toast(e.message); }
  },

  tamper(d, el) {
    S.tamper = el.checked;
    toast(S.tamper ? 'Next payment code will be tampered' : 'Tampering off');
  },

  async resetPhone() {
    if (!confirm('Delete Offline Pay keys and vault on this phone?')) return;
    await S.op.destroy();
    store.del(`${S.account}:simOffline`);
    location.reload();
  },
};

// The SDK takes the request as its QR text; rebuild it from the parsed object.
const encodeReq = (req) => 'OPAY1:' + JSON.stringify(req);

async function finishAuth(path, body) {
  S.authError = '';
  try {
    const { token, me } = await api(path, body);
    S.authMode = 'login';
    startSession(token, me);
    await refreshLocal();
    go('home');
    await refreshRemote();
    render();
  } catch (e) {
    S.authError = e.message;
    render();
  }
}

const forms = {
  login(fd) {
    finishAuth('/login', { username: fd.get('username').trim().toLowerCase(), password: fd.get('password') });
  },
  signup(fd) {
    if (fd.get('password') !== fd.get('confirm')) { S.authError = 'Passwords do not match'; render(); return; }
    finishAuth('/signup', {
      name: fd.get('name').trim(),
      username: fd.get('username').trim().toLowerCase(),
      password: fd.get('password'),
      type: fd.get('type'),
    });
  },
  setup(fd, submitter) {
    let server = String(fd.get('server') || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(server)) server = 'http://' + server;
    const wallet = submitter?.value || 'paya';
    try { localStorage.setItem('opay:config', JSON.stringify({ server, wallet })); } catch {}
    location.reload();
  },
  async load(fd) {
    try {
      await S.op.load(Number(fd.get('amount')));
      await refreshRemote(); await refreshLocal();
      toast('Vault loaded');
      go('offline');
    } catch (e) { toast(e.message); }
  },
  async receive(fd) {
    try {
      const amount = Number(fd.get('amount'));
      const qr = await S.op.createRequest(amount, S.me?.name || S.account);
      go('receiveQR', { qr, amount });
    } catch (e) { toast(e.message); }
  },
  async topup(fd) {
    try { S.me = await api('/topup', { amount: Number(fd.get('amount')) }); toast('Money loaded'); go('home'); }
    catch (e) { toast(e.message); }
  },
  async send(fd) {
    try { S.me = await api('/send', { to: fd.get('to').trim(), amount: Number(fd.get('amount')) }); toast('Sent'); go('home'); }
    catch (e) { toast(e.message); }
  },
};

$app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  if (el.type === 'checkbox') return actions[el.dataset.action]?.(el.dataset, el);
  e.preventDefault();
  actions[el.dataset.action]?.(el.dataset, el);
});
$app.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target.closest('[data-form]');
  if (f) forms[f.dataset.form]?.(new FormData(f), e.submitter);
});
addEventListener('online', () => { refreshRemote().then(refreshLocal).then(render); });
addEventListener('offline', () => render());

// Background refresh: picks up settlements and incoming credits.
setInterval(async () => {
  if (!S.account) return;
  await refreshRemote();
  await refreshLocal();
  if (['home', 'offline'].includes(S.view) && signature() !== lastSig) render();
}, 4000);

// ---------- boot ----------
(async () => {
  // The Android app bundles its files, so only the browser version needs the offline cache.
  if (!NATIVE && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (S.account) {
    S.me = store.get(`${S.account}:me`);
    setupSdk();
    await refreshLocal();
  }
  await render();
  if (S.account) { await refreshRemote(); await refreshLocal(); render(); }
})();
