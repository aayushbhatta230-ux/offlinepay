# OfflinePay — offline payments SDK + API (demo)

OfflinePay lets digital wallets (eSewa/Khalti-style) offer payments that work with **no internet**.
Wallets embed our SDK in their app and call our API from their backend. We never hold money:
wallets keep their ledgers, and we tell them what to debit and credit.

**PayA** and **PayB** in this repo are mock wallets used to demonstrate the integration.

## Android app (no laptop needed)

Download **OfflinePay-Wallet.apk** from the newest numbered release under **Releases** and install it.
The app runs the whole backend **on the phone** (standalone mode): pick **PayA** or **PayB**, create an
account and use it. The phones only exchange QR codes.

- Each phone keeps its own accounts and its own copy of the OfflinePay engine.
- Phones trust each other's device certificates through a demo issuer key built into the app.
- Each phone settles its own side when it's back online. The merchant's phone catches a customer who pays it twice with the same money, and the customer's phone catches its own rolled-back vault and freezes the account.
- Limit: a double-spend split across two *different* merchants' phones is only caught by a central server. That's what the real product (server mode) is for.

The Android app also has an advanced **server mode** (setup screen → "Advanced"), where phones connect to `npm start` on a laptop and share one backend and the live dashboard.

Build the APK locally (needs JDK 21 + Android SDK): `npm run build:android`, then `cd android && ./gradlew assembleDebug`.
GitHub Actions builds it on every push; pushing a tag like `v2.1` publishes a numbered release.

## iPhone (and any phone browser)

Open **https://aayushbhatta230-ux.github.io/offlinepay/** in Safari, tap **Share → Add to Home Screen**, then
open **OfflinePay** from the new icon. It's the same standalone app as the APK: everything runs on the
phone, and after the first visit it opens in airplane mode.

- Create your account **inside the home-screen app**. Safari tabs and home-screen apps keep separate storage.
- Allow camera access when you scan for the first time.
- The site is rebuilt and published by GitHub Actions on every push to `main` (`npm run build:web` builds it locally into `site/`).
- An iPhone and an Android phone can pay each other: they only exchange QR codes.

## Run the laptop server (optional)

```bash
npm install
npm start          # http://localhost:3000
npm test           # server end-to-end test + two-phone standalone test
```

| URL | What |
|---|---|
| `/` | Demo home |
| `/paya/` | PayA wallet app |
| `/payb/` | PayB wallet app |
| `/dashboard/` | OfflinePay partner console (put it on the projector) |

### Phone browsers (no APK)
Phone browsers only allow the camera and offline mode over **HTTPS**. Expose the laptop with a tunnel:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Open the `https://…trycloudflare.com/paya/` link on phone 1 and `/payb/` on phone 2 **while online once**
(this caches the app), then airplane mode works. No camera? Every QR screen has "Copy code" and the
scanner accepts pasted codes.

## Architecture

```
Wallet app ── embeds ── OfflinePay SDK (sdk/offlinepay-sdk.js)
                         keys · vault · sign/verify · QR · sync
      │ online only
Wallet backend ── partner key ──► OfflinePay API (core/engine.js)
      ▲                            issuer · settlement · fraud engine
      └────────── webhooks ───────┘
```

- `sdk/protocol.js` — shared crypto (ECDSA P-256 via WebCrypto, canonical JSON, token checks). Same code runs on phone and server.
- `sdk/offlinepay-sdk.js` — what a wallet embeds. Non-extractable device key, vault (balance, counter, hash chain), outbox sync.
- `core/engine.js` — the backend: our OfflinePay API (issuer, settlement, fraud engine) plus the mock PayA/PayB wallets (accounts, ledgers, webhook handlers). It uses no Node-specific code, so it runs on the laptop server **and** inside the phone app.
- `server/index.js` — optional HTTP server around the engine, plus the web apps and dashboard.
- `apps/wallet/` — the wallet app (also packaged as the APK). `local-backend.js` runs the engine on the phone in standalone mode.
- `apps/dashboard/` — partner console for server mode. In the app: **Profile → OfflinePay console**.

### How a payment works
1. **Enable (online):** the device generates a key pair; the private key never leaves it. The wallet backend registers the public key → OfflinePay returns a signed **device certificate**.
2. **Load (online):** the wallet locks Rs X in its own ledger → OfflinePay signs a **load certificate** → the SDK adds X to the vault.
3. **Pay (offline):** the payee shows a request QR `{payee, amount, nonce}`. The payer signs a **payment token** `{txId, cert, payee, amount, counter, prevHash, nonce, ts}` and shows it as a QR.
4. **Verify (offline):** the payee checks the certificate (signed by OfflinePay), the payer's signature, and that the nonce matches its own unused request (blocks replays).
5. **Settle (online):** either phone uploads the token. The API checks the signatures, that each counter is used once, the hash chain, and that total spending ≤ loaded amount. It then sends webhooks: `settlement.debit` to the payer's wallet and `settlement.credit` to the payee's. A conflict causes `fraud.detected`, freezes the device, and adds it to the revocation list.

### API (v1)

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /v1/issuer` | – | OfflinePay public key |
| `POST /v1/devices/register` `{account, name, pub}` | partner key | → `{cert}` |
| `POST /v1/offline/load` `{deviceId, amount}` | partner key | → `{loadCert}` (wallet must lock funds first) |
| `POST /v1/devices/:id/freeze` | partner key | Block a device |
| `POST /v1/sync` `{deviceId, tokens[]}` | – (tokens are signed) | Settle tokens, idempotent → results, device status, revocations |
| `GET /v1/settlement/:txId` | – | Status of a payment |
| `GET /v1/revocations` | – | Frozen device IDs |

Webhooks to the wallet: `settlement.debit`, `settlement.credit`, `settlement.rejected`, `fraud.detected`.

Partner integration from the app side:

```js
import { OfflinePay } from 'offlinepay-sdk';
const op = new OfflinePay({ partner: 'paya', account, registerDevice, requestLoad });
await op.enable();
await op.load(1000);
const paymentQR = await op.pay(requestQR);     // payer, offline
const result = await op.receive(paymentQR);    // payee, offline
```

## Accounts
There are no built-in users. Each person creates an account in the app (**Create account**): full name,
username, password (8+ characters) and type (personal or merchant). New accounts get Rs 5,000 of demo money.

- Passwords are stored as salted hashes (**PBKDF2** on the phone, **scrypt** on the laptop server); sessions are random tokens (only their hash is stored), valid 30 days.
- Every wallet API acts on the signed-in user only, so a phone can only register and load Offline Pay for its own account.
- 5 wrong passwords lock that username for 1 minute.
- In standalone mode, accounts live on that phone and signing in works offline. In server mode, signing in needs a connection.

## Demo script (≈3 min, two phones)

Suggested setup: phone 1 = **customer** account on PayA, phone 2 = **merchant** account on PayB (cross-wallet payment).

1. Both phones: **Offline Pay** tab → Set up. Customer: load Rs 1,000. (Server mode: put the dashboard on the projector.)
2. **Airplane mode on both** (or tap the Online pill to simulate offline).
3. Customer: open *Demo: attack tools* → **Save vault snapshot**.
4. Merchant: **Receive** → Rs 200 → shows QR. Customer: **Scan** (middle button) → Confirm & pay → shows QR. Merchant: *Scan customer's code* → ✅ *Payment verified*.
5. **Tamper:** customer turns on "Tamper with next payment" and pays a new request → merchant scan → ❌ *Invalid signature*.
6. **Double-spend:** customer → **Roll back vault** (Rs 1,000 is back). Merchant makes a new Rs 900 request, customer pays, merchant verifies → ✅ (looks valid offline — this is the honest risk).
7. **Back online:** the merchant's phone settles ✅ Rs 200 and blocks 🚩 the Rs 900 double-spend. When the customer's phone reconnects, its account is frozen. Show it in **Profile → OfflinePay console**.

Reset between rehearsals: **Profile → Erase all data on this phone** (standalone), or **Reset demo** on the dashboard (server mode) and **Reset Offline Pay on this phone**.

## Honest limits of this demo
- The vault is in IndexedDB and enforced in software. Production needs hardware-backed keys and counters (Android StrongBox / iOS Secure Enclave); the protocol is designed for that.
- Double-spending is **detected and capped** (Rs 5,000 per device, KYC'd users), not prevented offline.
- QR codes are dense (~680 chars). Turn phone brightness up when scanning.
- Standalone mode stores everything in the app's local storage; uninstalling the app erases it. The server stores data in `data/state.json`.
- The demo issuer key in standalone mode is built into the app, so anyone with the APK could mint certificates. In server mode the key never leaves the server.
- The dashboard and its reset button have no login — it is meant for the presenter's laptop.
