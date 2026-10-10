// Bundles the wallet app into www/ for the Android build (Capacitor serves it from inside the APK).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'www');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'sdk'), { recursive: true });
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });

for (const f of ['app.js', 'styles.css']) {
  fs.copyFileSync(path.join(root, 'apps', 'wallet', f), path.join(out, f));
}
for (const f of ['offlinepay-sdk.js', 'protocol.js']) {
  fs.copyFileSync(path.join(root, 'sdk', f), path.join(out, 'sdk', f));
}
fs.copyFileSync(path.join(root, 'node_modules', 'qrcode-generator', 'qrcode.js'), path.join(out, 'vendor', 'qrcode.js'));
fs.copyFileSync(path.join(root, 'node_modules', 'jsqr', 'dist', 'jsQR.js'), path.join(out, 'vendor', 'jsQR.js'));

const html = fs.readFileSync(path.join(root, 'apps', 'wallet', 'index.html'), 'utf8')
  .replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
  .replace('<script src="/vendor/qrcode.js">', '<script>window.OPAY_NATIVE = true;</script>\n  <script src="/vendor/qrcode.js">');
fs.writeFileSync(path.join(out, 'index.html'), html);

console.log('Built www/ for the Android app');
