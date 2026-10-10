const $root = document.getElementById('root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rs = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN');
const time = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const NAMES = { paya: 'PayA', payb: 'PayB' };
const tag = (p) => `<span class="tag ${esc(p)}">${esc(NAMES[p] || p)}</span>`;

let seen = new Set();
let first = true;

async function load() {
  const [state, paya, payb] = await Promise.all([
    fetch('/v1/admin/state').then((r) => r.json()),
    fetch('/paya/api/ledger').then((r) => r.json()),
    fetch('/payb/api/ledger').then((r) => r.json()),
  ]);
  render(state, { paya, payb });
}

function render(s, ledgers) {
  const settled = s.txs.filter((t) => t.status === 'settled');
  const fraud = s.txs.filter((t) => t.status === 'fraud');
  const frozen = s.devices.filter((d) => d.status === 'frozen');
  const latestFraud = fraud[0];

  const ledgerTable = (id) => `
    <div class="card w4">
      <h2>${tag(id)} wallet ledger</h2>
      <div class="tbl"><table>
        <tr><th>Account</th><th class="r">Balance</th><th class="r">Locked offline</th></tr>
        ${ledgers[id].map((a) => `
          <tr class="${a.frozen ? 'frozen-row' : ''}"><td>${esc(a.name)}${a.frozen ? ' 🚩' : ''}</td><td class="r">${rs(a.main)}</td><td class="r">${rs(a.locked)}</td></tr>`).join('')}
      </table></div>
    </div>`;

  const netLines = Object.entries(s.net).map(([k, v]) => {
    const [from, to] = k.split('->');
    return `<div class="net">${tag(from)} owes ${tag(to)} ${rs(v)}</div>`;
  });

  $root.innerHTML = `
    ${latestFraud ? `<div class="alert">🚩 Fraud blocked: ${esc(latestFraud.payer.name)} (${esc(NAMES[latestFraud.payer.partner])}) tried to spend ${rs(latestFraud.amount)} twice — ${esc(latestFraud.reason)}. Device frozen.</div>` : ''}
    <section class="stats">
      <div class="card stat"><div class="v">${rs(settled.reduce((a, t) => a + t.amount, 0))}</div><div class="l">Offline volume settled</div></div>
      <div class="card stat"><div class="v">${settled.length}</div><div class="l">Payments settled</div></div>
      <div class="card stat ${fraud.length ? 'bad' : ''}"><div class="v">${rs(fraud.reduce((a, t) => a + t.amount, 0))}</div><div class="l">Fraud attempts blocked (${fraud.length})</div></div>
      <div class="card stat"><div class="v">${s.devices.length - frozen.length}<span class="muted" style="font-size:14px"> / ${s.devices.length}</span></div><div class="l">Active devices</div></div>
    </section>

    ${ledgerTable('paya')}
    ${ledgerTable('payb')}
    <div class="card w4">
      <h2>Inter-wallet settlement</h2>
      ${netLines.join('') || '<div class="muted">No cross-wallet payments yet</div>'}
      <p class="muted" style="margin-bottom:0">Net amounts the wallets settle between each other through their usual bank settlement.</p>
    </div>

    <div class="card w8">
      <h2>Offline transactions</h2>
      <div class="tbl"><table>
        <tr><th>Time</th><th>From</th><th>To</th><th class="r">Amount</th><th>#</th><th>Status</th></tr>
        ${s.txs.slice(0, 25).map((t) => `
          <tr>
            <td>${time(t.settledAt)}</td>
            <td>${esc(t.payer.name)} ${tag(t.payer.partner)}</td>
            <td>${esc(t.payee.name)} ${tag(t.payee.partner)}</td>
            <td class="r">${rs(t.amount)}</td>
            <td>${t.counter}</td>
            <td><span class="st ${t.status}">${t.status.toUpperCase()}</span>${t.reason ? `<div class="muted" style="font-size:12px">${esc(t.reason)}</div>` : ''}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="muted">Waiting for phones to sync…</td></tr>'}
      </table></div>
    </div>

    <div class="card w4">
      <h2>API &amp; webhook log</h2>
      <div class="events">
        ${s.events.map((e) => `<div class="ev ${e.kind} ${!first && !seen.has(e.id) ? 'flash' : ''}"><time>${time(e.at)}</time><span>${esc(e.message)}</span></div>`).join('')}
      </div>
    </div>

    <div class="card w12">
      <h2>Registered devices</h2>
      <div class="tbl"><table>
        <tr><th>Device</th><th>Owner</th><th>Wallet</th><th class="r">Loaded</th><th class="r">Spent</th><th class="r">Remaining</th><th>Status</th></tr>
        ${s.devices.map((d) => `
          <tr>
            <td style="font-family:ui-monospace,monospace">${esc(d.deviceId.slice(0, 10))}</td>
            <td>${esc(d.name)}</td><td>${tag(d.partner)}</td>
            <td class="r">${rs(d.loaded)}</td><td class="r">${rs(d.spent)}</td><td class="r">${rs(d.loaded - d.spent)}</td>
            <td><span class="st ${d.status}">${d.status.toUpperCase()}</span>${d.frozenReason ? `<div class="muted" style="font-size:12px">${esc(d.frozenReason)}</div>` : ''}</td>
          </tr>`).join('') || '<tr><td colspan="7" class="muted">No devices yet — enable Offline Pay in a wallet</td></tr>'}
      </table></div>
    </div>`;

  seen = new Set(s.events.map((e) => e.id));
  first = false;
}

document.getElementById('reset').onclick = async () => {
  if (!confirm('Reset all demo data? (Also tap "Reset this phone" on each phone.)')) return;
  await Promise.all([
    fetch('/v1/admin/reset', { method: 'POST' }),
    fetch('/paya/api/reset', { method: 'POST' }),
    fetch('/payb/api/reset', { method: 'POST' }),
  ]);
  load();
};

const loop = async () => {
  try { await load(); } catch {}
  setTimeout(loop, 1000);
};
loop();
