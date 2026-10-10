// Bundles the wallet app into www/ for the Android build (Capacitor serves it from inside the APK).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'www');
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(path.join(out, to)), { recursive: true });
  fs.copyFileSync(path.join(root, from), path.join(out, to));
};

fs.rmSync(out, { recursive: true, force: true });
for (const f of ['app.js', 'styles.css', 'icons.js', 'local-backend.js']) copy(`apps/wallet/${f}`, f);
for (const f of ['offlinepay-sdk.js', 'protocol.js']) copy(`sdk/${f}`, `sdk/${f}`);
for (const f of ['engine.js', 'passwords-web.js', 'demo-issuer.js']) copy(`core/${f}`, `core/${f}`);
copy('node_modules/qrcode-generator/qrcode.js', 'vendor/qrcode.js');
copy('node_modules/jsqr/dist/jsQR.js', 'vendor/jsQR.js');

const html = fs.readFileSync(path.join(root, 'apps', 'wallet', 'index.html'), 'utf8')
  .replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
  .replace('<script src="/vendor/qrcode.js">', '<script>window.OPAY_NATIVE = true;</script>\n  <script src="/vendor/qrcode.js">');
fs.writeFileSync(path.join(out, 'index.html'), html);

console.log('Built www/ for the Android app');
