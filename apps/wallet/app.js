import { OfflinePay } from '/sdk/offlinepay-sdk.js';
import { icon } from './icons.js';

// ---------------------------------------------------------------------------
// Configuration
//   Browser (served by the laptop server): wallet from the URL (/paya/, /payb/), server = this origin.
//   Android app (window.OPAY_NATIVE): wallet chosen on first launch. By default the whole backend
//   runs on the phone ("standalone"); a laptop server can be used instead (advanced).
// ---------------------------------------------------------------------------
const NATIVE = !!window.OPAY_NATIVE;
const BRANDS = {
  paya: { name: 'PayA', tagline: 'Digital wallet', theme: '#3d9a3d' },
  payb: { name: 'PayB', tagline: 'Digital wallet', theme: '#5c2d91' },
};
const readConfig = () => { try { return JSON.parse(localStorage.getItem('opay:config')) || {}; } catch { return {}; } };
const writeConfig = (c) => { try { localStorage.setItem('opay:config', JSON.stringify(c)); } catch {} };
const CFG = readConfig();
const WALLET = NATIVE ? CFG.wallet : (location.pathname.split('/')[1] || 'paya');
const LOCAL = NATIVE && CFG.mode !== 'server';
const SERVER = NATIVE && !LOCAL ? (CFG.server || '').replace(/\/+$/, '') : '';
const BRAND = BRANDS[WALLET] || BRANDS.paya;
document.documentElement.dataset.wallet = WALLET || 'paya';
document.title = `${BRAND.name} Wallet`;
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BRAND.theme);

const local = LOCAL && WALLET ? await import('./local-backend.js') : null;

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const npr = (n) => `NPR ${fmt(n)}`;
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const when = (t) => {
  if (!t) return 'never';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
};
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(`${WALLET}:${k}`)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`${WALLET}:${k}`, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(`${WALLET}:${k}`); } catch {} },
};
const walletName = (id) => BRANDS[id]?.name || id;

let toastTimer;
function toast(msg) {
  $toast.textContent = msg;
  $toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $toast.hidden = true; }, 2800);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const S = {
  token: store.get('token'),
  account: store.get('token') ? store.get('account') : null,
  me: null,
  op: null,
  opState: { enabled: false },
  txs: [],
  tab: 'home',
  simOffline: false,
  tamper: false,
  demoOpen: false,
  hideBalance: !!store.get('hideBalance'),
  authMode: 'login',
  authError: '',
  stmtFilter: 'all',
};

const online = () => navigator.onLine && !S.simOffline;

// In standalone mode these still "need internet" so the demo story stays realistic.
const NEEDS_NET_LOCAL = new Set(['/topup', '/send', '/offline/enable', '/offline/load']);

async function api(path, body) {
  const needsNet = LOCAL ? NEEDS_NET_LOCAL.has(path) : true;
  if (needsNet && !online()) throw new Error('No internet connection');
  let status, data;
  if (LOCAL) {
    ({ status, body: data } = await local.request(body ? 'POST' : 'GET', `/${WALLET}/api${path}`, body, S.token));
  } else {
    const headers = body ? { 'Content-Type': 'application/json' } : {};
    if (S.token) headers.Authorization = `Bearer ${S.token}`;
    let res;
    try {
      res = await fetch(`${SERVER}/${WALLET}/api${path}`, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new Error(NATIVE ? `Can't reach the server at ${SERVER}` : "Can't reach the server");
    }
    status = res.status;
    data = await res.json();
  }
  if (status === 401 && S.token) {
    endSession();
    toast('Please sign in again');
    render();
  }
  if (status >= 400) throw new Error(data.error || 'Request failed');
  return data;
}

async function adminState() {
  if (LOCAL) return (await local.request('GET', '/v1/admin/state')).body;
  return (await fetch(`${SERVER}/v1/admin/state`)).json();
}

function setupSdk() {
  S.op = new OfflinePay({
    partner: WALLET,
    account: S.account,
    apiBase: SERVER,
    transport: LOCAL ? async (path, body) => {
      const r = await local.request(body ? 'POST' : 'GET', path, body);
      if (r.status >= 400) throw new Error(r.body.error);
      return r.body;
    } : undefined,
    // The signed-in session decides whose account this is; the app never names the account itself.
    registerDevice: async (pub) => (await api('/offline/enable', { pub })).cert,
    requestLoad: async (deviceId, amount) => (await api('/offline/load', { deviceId, amount })).loadCert,
    onChange: () => refreshLocal(),
  });
  S.simOffline = !!store.get(`${S.account}:simOffline`);
  S.op.simulateOffline = S.simOffline;
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
  Object.assign(S, { account: null, token: null, op: null, me: null, opState: { enabled: false }, txs: [], simOffline: false, tab: 'home' });
  nav.stack = [];
  store.del('token');
  store.del('account');
}

async function refreshLocal() {
  if (!S.op) return;
  S.opState = await S.op.state();
  S.txs = await S.op.transactions();
}

async function refreshRemote() {
  if (!S.account) return;
  // Settle first, so the balance read afterwards already includes new credits.
  if (online()) { try { await S.op?.sync(); } catch {} }
  if (LOCAL || online()) {
    try {
      const me = await api('/me');
      if (S.account) { S.me = me; store.set(`${S.account}:me`, { ...me, cachedAt: Date.now() }); }
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Navigation. Sub-screens sit on a stack above the tabs; one browser-history entry is kept while the
// stack (or the scanner) is open, so Android's back button closes them instead of quitting the app.
// ---------------------------------------------------------------------------
const nav = { stack: [], hasEntry: false, ignorePop: false, scanner: null };
const current = () => nav.stack[nav.stack.length - 1] || null;

function ensureEntry() {
  if (!nav.hasEntry) { history.pushState({ sub: 1 }, ''); nav.hasEntry = true; }
}
function dropEntry() {
  if (nav.hasEntry && !nav.stack.length && !nav.scanner) { nav.hasEntry = false; nav.ignorePop = true; history.back(); }
}
function go(view, params = {}) {
  nav.stack.push({ view, params });
  ensureEntry();
  render();
  scrollTo(0, 0);
}
function back() {
  nav.stack.pop();
  dropEntry();
  render();
}
function resetTo(tab) {
  nav.stack = [];
  S.tab = tab;
  dropEntry();
  render();
  scrollTo(0, 0);
}
addEventListener('popstate', () => {
  if (nav.ignorePop) { nav.ignorePop = false; return; }
  nav.hasEntry = false;
  if (nav.scanner) nav.scanner.cancel();
  else if (nav.stack.length) nav.stack.pop();
  if (nav.stack.length || nav.scanner) ensureEntry();
  render();
});

// ---------------------------------------------------------------------------
// QR + scanner
// ---------------------------------------------------------------------------
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
  try { document.execCommand('copy'); toast('Code copied'); } catch { toast('Copy failed'); }
  t.remove();
}

function scan(title, hint) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'scanner';
    el.innerHTML = `
      <div class="scan-top">
        <button class="scan-close" data-cancel aria-label="Close">${icon('arrow-left')}</button>
        <strong>${esc(title)}</strong>
      </div>
      <div class="scan-frame"><video playsinline muted></video><span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span></div>
      <p class="scan-hint" data-cam>${esc(hint)}</p>
      <details class="scan-paste">
        <summary>No camera? Paste a code instead</summary>
        <textarea placeholder="Paste the code (starts with OPAY1:)"></textarea>
        <button class="btn" data-use>Use code</button>
      </details>`;
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
      nav.scanner = null;
      dropEntry();
      resolve(val);
    };
    nav.scanner = { cancel: () => finish(null) };
    ensureEntry();
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
      camMsg.textContent = 'Camera not available here — paste the code below.';
      el.querySelector('.scan-paste').open = true;
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        if (done) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s; video.srcObject = s; video.play();
        requestAnimationFrame(tick);
      })
      .catch(() => {
        camMsg.textContent = 'Camera permission was not given — allow it in phone settings, or paste the code below.';
        el.querySelector('.scan-paste').open = true;
      });
  });
}

// ---------------------------------------------------------------------------
// Shared UI pieces
// ---------------------------------------------------------------------------
const netPill = () => `
  <button class="net-pill ${online() ? '' : 'off'}" data-action="toggleNet" title="Tap to simulate going offline">
    ${icon(online() ? 'wifi' : 'wifi-off', 14)}${online() ? 'Online' : 'Offline'}${S.simOffline ? ' (demo)' : ''}
  </button>`;

const topBar = (title, { backBtn = true, right = '' } = {}) => `
  <header class="topbar">
    ${backBtn ? `<button class="tb-btn" data-action="back" aria-label="Back">${icon('arrow-left')}</button>` : '<span class="tb-gap"></span>'}
    <h1>${esc(title)}</h1>
    ${right || netPill()}
  </header>`;

// iPhone web version opened in a Safari tab: suggest the home-screen app (it has its own, separate storage).
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installHint = () => (IOS && NATIVE && !window.OPAY_APK && !navigator.standalone)
  ? `<div class="notice warn slim">${icon('circle-help', 18)}<div><b>Install it first</b><span>Tap <b>Share</b> → <b>Add to Home Screen</b>, then open OfflinePay from the new icon. Accounts made in a Safari tab don't carry over to the home-screen app.</span></div></div>` : '';

const frozen = () => !!(S.me?.frozen || S.opState.frozen);
const frozenBanner = () => frozen()
  ? `<div class="notice bad">${icon('shield-alert', 20)}<div><b>Account frozen</b><span>A fraud alert was raised on Offline Pay. Contact ${BRAND.name} support.</span></div></div>` : '';

const statusChip = (s) => ({
  pending: '<span class="chip pending">Pending settlement</span>',
  settled: '<span class="chip settled">Settled</span>',
  fraud: '<span class="chip fraud">Fraud — blocked</span>',
  rejected: '<span class="chip fraud">Rejected</span>',
}[s] || '');

const vaultChip = () => {
  if (!S.opState.enabled) return '<span class="chip muted">Not set up</span>';
  if (S.opState.frozen) return '<span class="chip fraud">Frozen</span>';
  return '<span class="chip settled">Ready offline</span>';
};

const bottomNav = () => {
  const item = (tab, ic, label) => `
    <button class="bn-item ${S.tab === tab ? 'on' : ''}" data-action="tab" data-tab="${tab}">${icon(ic, 22)}<span>${label}</span></button>`;
  return `
    <nav class="bottom-nav">
      ${item('home', 'house', 'Home')}
      ${item('statement', 'file-text', 'Statement')}
      <button class="bn-scan" data-action="scanPay" aria-label="Scan and pay">${icon('scan-line', 28)}<span>Scan</span></button>
      ${item('vault', 'wallet', 'Offline Pay')}
      ${item('profile', 'user', 'Profile')}
    </nav>`;
};

const SERVICES = [
  ['smartphone', 'Topup', '#e8f1ff', '#2f6fdb'],
  ['zap', 'Electricity', '#fff4dc', '#d99000'],
  ['droplet', 'Khanepani', '#e2f6fb', '#1597b8'],
  ['wifi', 'Internet', '#efe8fb', '#7a4bd1'],
  ['tv', 'TV', '#ffe9e6', '#d6462f'],
  ['graduation-cap', 'Education', '#e6f6ec', '#249a52'],
  ['shield-check', 'Insurance', '#e8f1ff', '#2f6fdb'],
  ['plane', 'Flights', '#e2f6fb', '#1597b8'],
  ['bus', 'Bus Ticket', '#fff4dc', '#d99000'],
  ['clapperboard', 'Movies', '#ffe9e6', '#d6462f'],
  ['landmark', 'Government', '#e6f6ec', '#249a52'],
  ['layout-grid', 'More', '#f1f1f4', '#5d5d6b'],
];

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
const views = {
  // ---- Android first launch: pick the wallet this phone runs ----
  setup() {
    return `
      <div class="setup">
        <div class="setup-hero">
          <div class="logo-badge neutral">${icon('wallet', 34)}</div>
          <h1>OfflinePay demo</h1>
          <p>Digital wallets that keep working without internet.</p>
        </div>
        <form class="card pad" data-form="setup">
          ${installHint()}
          <h2 class="card-title">Which wallet app is this phone?</h2>
          <p class="muted small">Use one on each phone to show a payment between two different wallets.</p>
          <div class="wallet-pick">
            <button class="pick paya" name="wallet" value="paya"><span class="logo-badge sm">${icon('wallet', 22)}</span><b>PayA</b><small>Green wallet</small></button>
            <button class="pick payb" name="wallet" value="payb"><span class="logo-badge sm">${icon('wallet', 22)}</span><b>PayB</b><small>Purple wallet</small></button>
          </div>
          <details class="advanced">
            <summary>Advanced: connect to a laptop server</summary>
            <p class="muted small">Leave empty to run everything on this phone (recommended). Only fill this in if you run <b>npm start</b> on a laptop and want its live dashboard.</p>
            <label class="field"><span>Server address</span><input name="server" inputmode="url" autocapitalize="off" autocorrect="off" placeholder="http://192.168.1.10:3000"></label>
          </details>
        </form>
      </div>`;
  },

  // ---- sign in / create account ----
  login() {
    const signup = S.authMode === 'signup';
    return `
      <div class="auth">
        <div class="auth-hero">
          ${NATIVE ? `<button class="tb-btn auth-gear" data-action="settings" aria-label="Settings">${icon('settings')}</button>` : ''}
          <div class="logo-badge">${icon('wallet', 34)}</div>
          <h1>${BRAND.name}</h1>
          <p>${signup ? 'Create your wallet account' : 'Welcome back'}</p>
        </div>
        <div class="card pad auth-card">
          ${installHint()}
          <div class="seg">
            <button class="${signup ? '' : 'on'}" data-action="authMode" data-mode="login">Sign in</button>
            <button class="${signup ? 'on' : ''}" data-action="authMode" data-mode="signup">Create account</button>
          </div>
          ${S.authError ? `<div class="notice bad slim">${icon('circle-x', 18)}<div><span>${esc(S.authError)}</span></div></div>` : ''}
          ${!LOCAL && !online() ? `<div class="notice warn slim">${icon('wifi-off', 18)}<div><span>You are offline. Signing in needs a connection.</span></div></div>` : ''}
          <form data-form="${signup ? 'signup' : 'login'}">
            ${signup ? '<label class="field"><span>Full name</span><input name="name" required minlength="2" maxlength="40" autocomplete="name"></label>' : ''}
            <label class="field"><span>Username</span><input name="username" required autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="username"
              ${signup ? 'pattern="[a-z0-9_]{3,20}" title="3–20 lowercase letters, numbers or _"' : ''}></label>
            <label class="field"><span>Password</span><input name="password" type="password" required ${signup ? 'minlength="8" autocomplete="new-password"' : 'autocomplete="current-password"'}></label>
            ${signup ? `
              <label class="field"><span>Confirm password</span><input name="confirm" type="password" required minlength="8" autocomplete="new-password"></label>
              <div class="field"><span>Account type</span>
                <div class="two">
                  <label class="choice"><input type="radio" name="type" value="personal" checked>${icon('user', 18)} Personal</label>
                  <label class="choice"><input type="radio" name="type" value="merchant">${icon('store', 18)} Merchant</label>
                </div>
              </div>
              <p class="muted small">New accounts start with NPR 5,000 of demo money.</p>` : ''}
            <button class="btn" ${!LOCAL && !online() ? 'disabled' : ''}>${signup ? 'Create account' : 'Sign in'}</button>
          </form>
        </div>
        <p class="auth-foot">${LOCAL ? 'Your account is stored on this phone.' : ''} Demo app · Offline payments powered by OfflinePay</p>
      </div>`;
  },

  // ---- Home tab ----
  home() {
    const me = S.me || {};
    const o = S.opState;
    const hidden = S.hideBalance;
    const merchant = me.type === 'merchant';
    const qa = (action, ic, label, extra = '') => `
      <button class="qa" data-action="${action}" ${extra}><span class="qa-ic">${icon(ic, 22)}</span><span>${label}</span></button>`;
    return `
      <header class="hero">
        <div class="hero-row">
          <div class="avatar">${esc(initials(me.name || S.account))}</div>
          <div class="greet"><small>Namaste,</small><strong>${esc(me.name || S.account)}</strong></div>
          ${netPill()}
          <button class="hdr-btn" data-action="notifications" aria-label="Notifications">${icon('bell')}</button>
        </div>
      </header>
      <section class="balance">
        <div class="bal-row">
          <div>
            <div class="bal-label">Balance (NPR)</div>
            <div class="bal-amount">${hidden ? 'XXXX.XX' : fmt(me.main)}</div>
          </div>
          <button class="eye" data-action="toggleBalance" aria-label="${hidden ? 'Show' : 'Hide'} balance">${icon(hidden ? 'eye-off' : 'eye', 20)}</button>
        </div>
        <button class="vault-strip" data-action="tab" data-tab="vault">
          <span class="vs-ic">${icon('lock', 16)}</span>
          <span class="vs-text">Offline Vault ${o.enabled ? `<b>${hidden ? 'XXXX.XX' : npr(o.balance)}</b>` : ''}</span>
          ${vaultChip()}
          ${icon('chevron-right', 18)}
        </button>
        <div class="quick">
          ${merchant
            ? qa('receive', 'arrow-down-left', 'Receive') + qa('topup', 'circle-plus', 'Load Money') + qa('send', 'send', 'Send Money') + qa('tab', 'history', 'Statement', 'data-tab="statement"')
            : qa('topup', 'circle-plus', 'Load Money') + qa('send', 'send', 'Send Money') + qa('receive', 'arrow-down-left', 'Receive') + qa('tab', 'history', 'Statement', 'data-tab="statement"')}
        </div>
      </section>
      ${frozenBanner()}
      ${!online() ? `
        <div class="notice offline">${icon('wifi-off', 22)}
          <div><b>You're offline</b><span>${o.enabled ? `You can still pay with your Offline Vault (${npr(o.balance)}).` : 'Set up Offline Pay while online to pay without internet.'}</span></div>
          ${o.enabled ? `<button class="mini-btn" data-action="scanPay">Pay</button>` : ''}
        </div>` : ''}
      <button class="promo" data-action="onboarding">
        <div><span class="promo-tag">NEW</span><b>Offline Pay</b><span>Pay and get paid even with zero signal</span></div>
        <span class="promo-ic">${icon('wifi-off', 30)}</span>
      </button>
      <section class="services">
        <h2 class="sec-title">Services</h2>
        <div class="svc-grid">
          ${SERVICES.map(([ic, label, bg, fg]) => `
            <button class="svc" data-action="mock" data-name="${label}">
              <span class="svc-ic" style="background:${bg};color:${fg}">${icon(ic, 22)}</span><span>${label}</span>
            </button>`).join('')}
        </div>
      </section>`;
  },

  // ---- Statement tab ----
  statement() {
    const me = S.me || {};
    // In "All", offline settlements are shown once (from Offline Pay's own records), not twice.
    const wallet = (me.history || [])
      .filter((h) => S.stmtFilter === 'wallet' || !/^(Offline payment|⚠️ Offline payment)/.test(h.text))
      .map((h) => ({ at: h.at, title: h.text, amount: h.amount, kind: 'wallet' }));
    const offline = S.txs.map((t) => ({
      at: t.createdAt, kind: 'offline', status: t.status, reason: t.reason,
      title: `${t.dir === 'out' ? 'Offline payment to' : 'Offline payment from'} ${t.counterparty}${t.partner !== WALLET ? ` (${walletName(t.partner)})` : ''}`,
      amount: t.dir === 'in' ? t.amount : -t.amount,
    }));
    let rows = [...wallet, ...offline].sort((a, b) => b.at - a.at);
    if (S.stmtFilter !== 'all') rows = rows.filter((r) => r.kind === S.stmtFilter);
    const f = (id, label) => `<button class="${S.stmtFilter === id ? 'on' : ''}" data-action="stmtFilter" data-f="${id}">${label}</button>`;
    return `${topBar('Statement', { backBtn: false })}
      <div class="filters">${f('all', 'All')}${f('wallet', 'Wallet')}${f('offline', 'Offline Pay')}</div>
      <div class="card list">
        ${rows.map((r) => `
          <div class="row">
            <span class="row-ic ${r.amount > 0 ? 'in' : r.amount < 0 ? 'out' : ''}">${icon(r.kind === 'offline' ? 'wifi-off' : r.amount > 0 ? 'arrow-down-left' : r.amount < 0 ? 'send' : 'circle-check', 18)}</span>
            <div class="row-main"><div class="row-title">${esc(r.title)}</div><div class="row-sub">${when(r.at)}${r.reason ? ' · ' + esc(r.reason) : ''}</div>${r.status ? statusChip(r.status) : ''}</div>
            ${r.amount ? `<div class="row-amt ${r.amount > 0 ? 'pos' : ''} ${['fraud', 'rejected'].includes(r.status) ? 'void' : ''}">${r.amount > 0 ? '+' : '−'}${fmt(Math.abs(r.amount))}</div>` : ''}
          </div>`).join('') || '<div class="empty">No transactions yet</div>'}
      </div>`;
  },

  // ---- Offline Pay tab ----
  vault() {
    const o = S.opState;
    if (!o.enabled) {
      return `${topBar('Offline Pay', { backBtn: false })}
        <div class="card pad intro">
          <div class="intro-ic">${icon('wifi-off', 34)}</div>
          <h2>Pay without internet</h2>
          <p class="muted">Keep some money in an <b>Offline Vault</b> on this phone. Then you can pay or get paid by QR code even with no signal.</p>
          <ol class="steps">
            <li><b>Load</b> your vault while online</li>
            <li><b>Pay by QR</b> anywhere — no internet needed</li>
            <li>It <b>settles automatically</b> when you're back online</li>
          </ol>
          <button class="btn" data-action="enable" ${online() ? '' : 'disabled'}>Set up Offline Pay</button>
          ${online() ? '' : '<p class="muted small center">Needs internet once to set up.</p>'}
          <button class="link-btn" data-action="onboarding">How does it work?</button>
        </div>`;
    }
    const pending = S.txs.filter((t) => t.status === 'pending').length;
    const pct = Math.min(100, Math.round((o.balance / o.limit) * 100));
    return `${topBar('Offline Pay', { backBtn: false })}
      ${frozenBanner()}
      <section class="vault-card">
        <div class="vc-top"><span>${icon('lock', 16)} Offline Vault</span>${vaultChip()}</div>
        <div class="vc-amount">${npr(o.balance)}</div>
        <div class="vc-bar"><span style="width:${pct}%"></span></div>
        <div class="vc-meta"><span>Limit ${npr(o.limit)}</span><span>Works without internet</span></div>
      </section>
      <div class="big-actions">
        <button class="big-act" data-action="scanPay" ${o.frozen ? 'disabled' : ''}><span>${icon('scan-line', 26)}</span>Pay<small>Scan merchant QR</small></button>
        <button class="big-act" data-action="receive"><span>${icon('qr-code', 26)}</span>Receive<small>Show your QR</small></button>
      </div>
      <div class="card list">
        <button class="row link" data-action="loadVault" ${online() && !o.frozen ? '' : 'disabled'}>
          <span class="row-ic">${icon('circle-plus', 18)}</span><div class="row-main"><div class="row-title">Load vault</div><div class="row-sub">${online() ? 'Move money from your wallet balance' : 'Needs internet'}</div></div>${icon('chevron-right', 18)}
        </button>
        <button class="row link" data-action="sync" ${online() ? '' : 'disabled'}>
          <span class="row-ic">${icon('refresh-cw', 18)}</span><div class="row-main"><div class="row-title">Sync now${pending ? ` · ${pending} pending` : ''}</div><div class="row-sub">Last synced ${when(o.lastSync)}</div></div>${icon('chevron-right', 18)}
        </button>
        <button class="row link" data-action="onboarding">
          <span class="row-ic">${icon('circle-help', 18)}</span><div class="row-main"><div class="row-title">How Offline Pay works</div></div>${icon('chevron-right', 18)}
        </button>
      </div>
      <h2 class="sec-title pad-x">Offline payments</h2>
      <div class="card list">
        ${S.txs.map((t) => `
          <div class="row">
            <span class="row-ic ${t.dir === 'in' ? 'in' : 'out'}">${icon(t.dir === 'in' ? 'arrow-down-left' : 'send', 18)}</span>
            <div class="row-main">
              <div class="row-title">${t.dir === 'out' ? 'Paid ' : 'From '}${esc(t.counterparty)}${t.partner !== WALLET ? ` <span class="tag">${esc(walletName(t.partner))}</span>` : ''}</div>
              <div class="row-sub">${when(t.createdAt)}${t.reason ? ' · ' + esc(t.reason) : ''}</div>
              ${statusChip(t.status)}
            </div>
            <div class="row-amt ${t.dir === 'in' ? 'pos' : ''} ${['fraud', 'rejected'].includes(t.status) ? 'void' : ''}">${t.dir === 'in' ? '+' : '−'}${fmt(t.amount)}</div>
          </div>`).join('') || '<div class="empty">No offline payments yet</div>'}
      </div>
      <details class="demo" ${S.demoOpen ? 'open' : ''}>
        <summary>${icon('triangle-alert', 18)} Demo: attack tools</summary>
        <p class="muted small">These simulate a hacked phone so you can show the system catching it.</p>
        <button class="btn danger" data-action="snapshot">1. Save vault snapshot</button>
        <button class="btn danger" data-action="rollback">2. Roll back vault (clone money)</button>
        <label class="toggle"><span>Tamper with next payment (×10 amount)</span><input type="checkbox" data-action="tamper" ${S.tamper ? 'checked' : ''}></label>
      </details>`;
  },

  // ---- Profile tab ----
  profile() {
    const me = S.me || {};
    const item = (action, ic, title, sub = '', cls = '') => `
      <button class="row link ${cls}" data-action="${action}"><span class="row-ic">${icon(ic, 18)}</span><div class="row-main"><div class="row-title">${title}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</div>${icon('chevron-right', 18)}</button>`;
    return `${topBar('Profile', { backBtn: false })}
      <section class="card pad profile-head">
        <div class="avatar lg">${esc(initials(me.name || S.account))}</div>
        <div><h2>${esc(me.name || S.account)}</h2><p class="muted">@${esc(S.account)} · ${BRAND.name} · ${me.type === 'merchant' ? 'Merchant' : 'Personal'}</p></div>
      </section>
      <div class="card list">
        ${item('console', 'activity', 'OfflinePay console', LOCAL ? "Settlements and fraud checks on this phone" : 'Live settlements and fraud checks')}
        ${item('onboarding', 'circle-help', 'How Offline Pay works')}
        ${NATIVE ? item('settings', 'settings', 'Wallet & connection', LOCAL ? `${BRAND.name} · runs on this phone` : `${BRAND.name} · server ${esc(SERVER)}`) : ''}
      </div>
      <div class="card list">
        ${item('resetPhone', 'trash-2', 'Reset Offline Pay on this phone', 'Deletes this phone’s vault and keys', 'warn')}
        ${LOCAL ? item('eraseAll', 'trash-2', 'Erase all data on this phone', 'Accounts, balances and Offline Pay', 'warn') : ''}
        ${item('logout', 'log-out', 'Sign out', '', 'warn')}
      </div>
      <p class="foot">Demo app · OfflinePay SDK v1 · ${LOCAL ? 'Standalone mode (no server needed)' : 'Server mode'}</p>`;
  },

  // ---- sub-screens ----
  onboarding({ i = 0 } = {}) {
    const slides = [
      ['lock', 'Load your Offline Vault', 'While you have internet, move some money (up to NPR 5,000) into a secure vault on your phone. It is locked for you in your wallet.'],
      ['scan-line', 'Pay by QR — no signal needed', 'The shop shows a QR, you scan it and approve. Your phone shows a signed code; the shop scans it and sees ✅ verified. Neither phone needs internet.'],
      ['refresh-cw', 'It settles automatically', 'When either phone is back online, the payment settles in the background. Copied or edited payments are caught and the account is frozen.'],
    ];
    const [ic, title, text] = slides[i];
    const last = i === slides.length - 1;
    return `
      <div class="onb">
        <button class="onb-skip" data-action="onbDone">Skip</button>
        <div class="onb-ic">${icon(ic, 56)}</div>
        <div class="onb-step">Step ${i + 1} of ${slides.length}</div>
        <h1>${title}</h1>
        <p>${text}</p>
        <div class="dots">${slides.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>
        <button class="btn" data-action="${last ? 'onbDone' : 'onbNext'}" data-i="${i + 1}">${last ? 'Got it' : 'Next'}</button>
      </div>`;
  },

  loadVault() {
    return `${topBar('Load Offline Vault')}
      <form class="card pad" data-form="loadVault">
        <p class="muted">Moves money from your wallet balance (${npr(S.me?.main)}) into this phone's Offline Vault.</p>
        ${amountField(1000)}
        <button class="btn">Load vault</button>
      </form>`;
  },

  receive() {
    return `${topBar('Receive payment')}
      <form class="card pad" data-form="receive">
        <p class="muted">Enter the amount. The customer scans your QR, then shows you a code to scan. Works offline.</p>
        ${amountField('')}
        <button class="btn">Show QR</button>
      </form>`;
  },

  receiveQR({ qr, amount }) {
    return `${topBar('Receive payment')}
      <div class="card pad center">
        <div class="stepper"><span class="on">1</span><i></i><span>2</span></div>
        <p class="muted small">Step 1 · Let the customer scan this</p>
        <div class="who"><div class="avatar">${esc(initials(S.me?.name))}</div><div><b>${esc(S.me?.name)}</b><small>${BRAND.name} · @${esc(S.account)}</small></div></div>
        <div class="big-amt">${npr(amount)}</div>
        <div class="qr-wrap">${qrSvg(qr)}</div>
        <button class="btn" data-action="scanPayment">${icon('camera', 18)} Step 2 · Scan customer's code</button>
        <button class="link-btn" data-action="copy">${icon('copy', 16)} Copy request code</button>
      </div>`;
  },

  payConfirm({ req }) {
    const after = S.opState.balance - req.amount;
    return `${topBar('Confirm payment')}
      <div class="card pad center">
        <div class="who col"><div class="avatar lg">${esc(initials(req.payee.name))}</div><div><b>${esc(req.payee.name || req.payee.account)}</b><small>${esc(walletName(req.payee.partner))} · @${esc(req.payee.account)}</small></div></div>
        <div class="big-amt">${npr(req.amount)}</div>
        <div class="pay-from">${icon('lock', 16)}<span>Pay from Offline Vault</span><b>${npr(S.opState.balance)}</b></div>
        ${after < 0 ? `<div class="notice bad slim">${icon('circle-x', 18)}<div><span>Not enough in your Offline Vault</span></div></div>` : `<p class="muted small">Vault after payment: ${npr(after)}</p>`}
        <button class="btn" data-action="approvePay" ${after < 0 ? 'disabled' : ''}>Confirm & pay</button>
        <button class="link-btn" data-action="back">Cancel</button>
      </div>`;
  },

  payQR({ qr, req, tampered }) {
    return `${topBar('Show to merchant', { backBtn: false })}
      <div class="card pad center">
        <div class="stepper"><span class="done">✓</span><i></i><span class="on">2</span></div>
        <p class="muted small">Step 2 · Let ${esc(req.payee.name)} scan this</p>
        <div class="big-amt">${npr(req.amount)}</div>
        ${tampered ? `<div class="notice bad slim">${icon('triangle-alert', 18)}<div><span>Tampered: amount changed after signing</span></div></div>` : ''}
        <div class="qr-wrap">${qrSvg(qr)}</div>
        <p class="muted small">Signed by this phone · works offline</p>
        <button class="btn" data-action="doneTo" data-tab="vault">Done</button>
        <button class="link-btn" data-action="copy">${icon('copy', 16)} Copy payment code</button>
      </div>`;
  },

  result(p) {
    return `${topBar(p.ok ? 'Payment received' : 'Payment failed', { backBtn: false })}
      <div class="card pad center result ${p.ok ? 'ok' : 'bad'}">
        <div class="res-ic">${icon(p.ok ? 'circle-check' : 'circle-x', 64)}</div>
        <h2>${esc(p.title)}</h2>
        ${p.amount ? `<div class="big-amt">${npr(p.amount)}</div>` : ''}
        <p class="muted">${esc(p.sub)}</p>
        ${p.retry ? '<button class="btn" data-action="retryReceive">Back to QR</button>' : ''}
        <button class="btn ${p.retry ? 'ghost' : ''}" data-action="doneTo" data-tab="vault">Done</button>
      </div>`;
  },

  topup() {
    return `${topBar('Load Money')}
      <form class="card pad" data-form="topup">
        <div class="bank-pick">${icon('building-2', 20)}<div><b>Linked bank account</b><small>Demo Bank · ****4521</small></div></div>
        ${amountField(1000)}
        <button class="btn" ${online() ? '' : 'disabled'}>Load money</button>
        ${online() ? '' : '<p class="muted small center">Needs internet</p>'}
      </form>`;
  },

  send() {
    return `${topBar('Send Money')}
      <form class="card pad" data-form="send">
        <p class="muted">Online transfer to another ${BRAND.name} user${LOCAL ? ' on this phone' : ''}. To pay without internet, use <b>Scan</b>.</p>
        <label class="field"><span>Receiver's username</span><input name="to" required autocapitalize="off" autocorrect="off"></label>
        ${amountField('')}
        <button class="btn" ${online() ? '' : 'disabled'}>Send</button>
      </form>`;
  },

  async console() {
    let s;
    try { s = await adminState(); } catch { return `${topBar('OfflinePay console')}<div class="empty">Can't load console</div>`; }
    const settled = s.txs.filter((t) => t.status === 'settled');
    const fraud = s.txs.filter((t) => t.status === 'fraud');
    return `${topBar('OfflinePay console')}
      <p class="muted small pad-x">${s.mode === 'local' ? "This phone's OfflinePay engine — what it settled and caught." : 'Live view of the OfflinePay server.'}</p>
      <div class="stats">
        <div class="card stat"><b>${npr(settled.reduce((a, t) => a + t.amount, 0))}</b><span>Settled (${settled.length})</span></div>
        <div class="card stat ${fraud.length ? 'bad' : ''}"><b>${npr(fraud.reduce((a, t) => a + t.amount, 0))}</b><span>Fraud blocked (${fraud.length})</span></div>
      </div>
      <h2 class="sec-title pad-x">Activity log</h2>
      <div class="card list mono">
        ${s.events.map((e) => `<div class="row ev ${e.kind}"><div class="row-main"><div class="row-title">${esc(e.message)}</div><div class="row-sub">${new Date(e.at).toLocaleTimeString()}</div></div></div>`).join('') || '<div class="empty">Nothing yet</div>'}
      </div>`;
  },

  settings() {
    return `${topBar('Wallet & connection')}
      <form class="card pad" data-form="setup">
        <p class="muted">Changing this restarts the app. Accounts are kept separately for each wallet${LOCAL ? ' on this phone' : ''}.</p>
        <div class="wallet-pick">
          <button class="pick paya ${WALLET === 'paya' ? 'cur' : ''}" name="wallet" value="paya"><span class="logo-badge sm">${icon('wallet', 22)}</span><b>PayA</b><small>Green wallet</small></button>
          <button class="pick payb ${WALLET === 'payb' ? 'cur' : ''}" name="wallet" value="payb"><span class="logo-badge sm">${icon('wallet', 22)}</span><b>PayB</b><small>Purple wallet</small></button>
        </div>
        <details class="advanced" ${LOCAL ? '' : 'open'}>
          <summary>Advanced: connect to a laptop server</summary>
          <p class="muted small">Leave empty to run everything on this phone (recommended).</p>
          <label class="field"><span>Server address</span><input name="server" inputmode="url" autocapitalize="off" autocorrect="off" placeholder="http://192.168.1.10:3000" value="${esc(SERVER)}"></label>
        </details>
      </form>`;
  },
};

const amountField = (value) => `
  <label class="field"><span>Amount (NPR)</span><input class="amount" name="amount" type="number" inputmode="numeric" min="1" step="1" required value="${value}" placeholder="0"></label>
  <div class="presets">${[200, 500, 1000, 2000].map((v) => `<button type="button" data-action="preset" data-v="${v}">${v.toLocaleString('en-IN')}</button>`).join('')}</div>`;

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
let lastSig = '';
const signature = () => JSON.stringify([S.me, S.opState, S.txs.map((t) => [t.txId, t.status]), online(), S.tab, nav.stack.length]);

async function render() {
  if (NATIVE && !WALLET) { $app.innerHTML = views.setup(); return; }
  const cur = current();
  if (!S.account) {
    $app.className = 'sub';
    $app.innerHTML = cur?.view === 'settings' ? views.settings() : views.login();
    return;
  }
  if (cur) {
    $app.className = 'sub';
    $app.innerHTML = await views[cur.view](cur.params);
  } else {
    $app.className = 'tabs';
    $app.innerHTML = (await views[S.tab]()) + bottomNav();
  }
  lastSig = signature();
  const d = $app.querySelector('details.demo');
  if (d) d.addEventListener('toggle', () => { S.demoOpen = d.open; });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
const actions = {
  back,
  tab: (d) => { if (d.tab === 'vault' && !store.get('onboarded')) { S.tab = 'vault'; go('onboarding', { i: 0 }); return; } resetTo(d.tab); },
  doneTo: (d) => resetTo(d.tab),
  mock: (d) => toast(`${d.name} — not part of this demo`),
  notifications: () => toast('No new notifications'),
  topup: () => go('topup'),
  send: () => go('send'),
  receive: () => (S.opState.enabled ? go('receive') : (toast('Set up Offline Pay first'), resetTo('vault'))),
  loadVault: () => go('loadVault'),
  console: () => go('console'),
  settings: () => go('settings'),
  onboarding: () => go('onboarding', { i: 0 }),
  onbNext: (d) => { nav.stack[nav.stack.length - 1] = { view: 'onboarding', params: { i: Number(d.i) } }; render(); },
  onbDone: () => { store.set('onboarded', true); back(); },
  preset: (d, el) => { const input = el.closest('form').querySelector('input[name="amount"]'); input.value = d.v; },
  stmtFilter: (d) => { S.stmtFilter = d.f; render(); },

  toggleBalance() {
    S.hideBalance = !S.hideBalance;
    store.set('hideBalance', S.hideBalance);
    render();
  },

  authMode(d) {
    S.authMode = d.mode;
    S.authError = '';
    render();
  },

  async logout() {
    if (!confirm('Sign out? Your Offline Vault stays on this phone for when you sign back in.')) return;
    if (!LOCAL && online()) { try { await api('/logout', {}); } catch {} }
    else if (LOCAL) { try { await api('/logout', {}); } catch {} }
    endSession();
    render();
  },

  async toggleNet() {
    S.simOffline = !S.simOffline;
    if (S.op) S.op.simulateOffline = S.simOffline;
    if (S.account) store.set(`${S.account}:simOffline`, S.simOffline);
    toast(S.simOffline ? 'Demo: offline mode — no network used' : 'Back online — syncing…');
    render();
    if (online()) { await refreshRemote(); await refreshLocal(); render(); }
  },

  async enable() {
    try {
      await S.op.enable();
      await refreshLocal();
      toast('Offline Pay is set up on this phone');
      go('loadVault');
    } catch (e) { toast(e.message); }
  },

  async sync() {
    try {
      const res = await S.op.sync();
      await refreshRemote();
      await refreshLocal();
      const n = res?.results?.length || 0;
      toast(n ? `Synced ${n} payment${n > 1 ? 's' : ''}` : 'Everything is up to date');
      render();
    } catch (e) { toast(e.message); }
  },

  async scanPay() {
    if (!S.opState.enabled) { toast('Set up Offline Pay first'); resetTo('vault'); return; }
    if (S.opState.frozen) { toast('Offline Pay is frozen for this account'); return; }
    const text = await scan('Scan to pay', "Point at the merchant's QR code");
    if (!text) return;
    try { go('payConfirm', { req: S.op.parseRequest(text) }); } catch (e) { toast(e.message); }
  },

  async approvePay() {
    const { req } = current().params;
    try {
      let qr = await S.op.pay('OPAY1:' + JSON.stringify(req));
      const tampered = S.tamper;
      if (tampered) { qr = S.op.debug.tamper(qr, req.amount * 10); S.tamper = false; }
      nav.stack[nav.stack.length - 1] = { view: 'payQR', params: { qr, req, tampered } };
      render();
    } catch (e) { toast(e.message); }
  },

  async scanPayment() {
    const params = current().params;
    const text = await scan("Scan customer's code", "Point at the code on the customer's phone");
    if (!text) return;
    const r = await S.op.receive(text);
    await refreshLocal();
    if (r.ok) {
      navigator.vibrate?.([40, 40, 80]);
      nav.stack[nav.stack.length - 1] = { view: 'result', params: {
        ok: true, amount: r.amount, title: 'Payment verified',
        sub: `From ${r.payer}${r.payerPartner !== WALLET ? ` (${walletName(r.payerPartner)})` : ''}. Checked on this phone without internet — it settles automatically when you're online.`,
      } };
      render();
      if (online()) S.op.sync().then(refreshLocal).catch(() => {});
    } else {
      nav.stack[nav.stack.length - 1] = { view: 'result', params: { ok: false, title: 'Payment rejected', sub: r.reason, retry: params } };
      render();
    }
  },

  retryReceive() {
    nav.stack[nav.stack.length - 1] = { view: 'receiveQR', params: current().params.retry };
    render();
  },

  copy() { copyText(current().params.qr); },

  async snapshot() {
    await S.op.debug.snapshot();
    toast('Vault snapshot saved. Now make a payment.');
  },

  async rollback() {
    try {
      await S.op.debug.rollback();
      await refreshLocal();
      toast('Vault rolled back — the spent money is "back". Try paying again.');
      render();
    } catch (e) { toast(e.message); }
  },

  tamper(d, el) {
    S.tamper = el.checked;
    toast(S.tamper ? 'Next payment code will be tampered' : 'Tampering off');
  },

  async resetPhone() {
    if (!confirm("Delete this phone's Offline Vault and keys? Unsettled payments on this phone will be lost.")) return;
    await S.op.destroy();
    store.del(`${S.account}:simOffline`);
    location.reload();
  },

  async eraseAll() {
    if (!confirm('Erase ALL accounts, balances and Offline Pay data on this phone?')) return;
    try { await S.op?.destroy(); } catch {}
    try { for (const d of (await indexedDB.databases?.()) || []) indexedDB.deleteDatabase(d.name); } catch {}
    local?.erase();
    const cfg = readConfig();
    try { localStorage.clear(); } catch {}
    writeConfig(cfg);
    location.reload();
  },
};

async function finishAuth(path, body) {
  S.authError = '';
  try {
    const { token, me } = await api(path, body);
    S.authMode = 'login';
    startSession(token, me);
    await refreshLocal();
    resetTo('home');
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
      name: fd.get('name').trim(), username: fd.get('username').trim().toLowerCase(),
      password: fd.get('password'), type: fd.get('type'),
    });
  },
  setup(fd, submitter) {
    const wallet = submitter?.value;
    if (!wallet) return;
    let server = String(fd.get('server') || '').trim().replace(/\/+$/, '');
    if (server && !/^https?:\/\//i.test(server)) server = 'http://' + server;
    writeConfig(server ? { wallet, mode: 'server', server } : { wallet, mode: 'local' });
    location.reload();
  },
  async loadVault(fd) {
    try {
      await S.op.load(Number(fd.get('amount')));
      await refreshRemote(); await refreshLocal();
      toast('Offline Vault loaded');
      resetTo('vault');
    } catch (e) { toast(e.message); }
  },
  async receive(fd) {
    try {
      const amount = Number(fd.get('amount'));
      const qr = await S.op.createRequest(amount, S.me?.name || S.account);
      nav.stack[nav.stack.length - 1] = { view: 'receiveQR', params: { qr, amount } };
      render();
    } catch (e) { toast(e.message); }
  },
  async topup(fd) {
    try { S.me = await api('/topup', { amount: Number(fd.get('amount')) }); toast('Money loaded'); resetTo('home'); }
    catch (e) { toast(e.message); }
  },
  async send(fd) {
    try { S.me = await api('/send', { to: fd.get('to').trim(), amount: Number(fd.get('amount')) }); toast('Money sent'); resetTo('home'); }
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
  const cur = current();
  if ((!cur || cur.view === 'console') && signature() !== lastSig) render();
}, 4000);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
// The APK bundles its files; the browser and iPhone web versions need the offline cache.
if (!window.OPAY_APK && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (S.account) {
  S.me = store.get(`${S.account}:me`);
  setupSdk();
  await refreshLocal();
}
await render();
if (S.account) { await refreshRemote(); await refreshLocal(); render(); }
