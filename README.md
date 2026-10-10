# OfflinePay — offline payments SDK + API (demo)

OfflinePay lets digital wallets (eSewa/Khalti-style) offer payments that work with **no internet**.
Wallets embed our SDK in their app and call our API from their backend. We never hold money:
wallets keep their ledgers, and we tell them what to debit and credit.

**PayA** and **PayB** in this repo are mock wallets used to demonstrate the integration.

## Run it

```bash
npm install
npm start          # http://localhost:3000
npm test           # end-to-end test of the whole protocol
```

| URL | What |
|---|---|
| `/` | Demo home |
| `/paya/` | PayA wallet app |
| `/payb/` | PayB wallet app |
| `/dashboard/` | OfflinePay partner console (put it on the projector) |

### Android app (APK)
Every push to `main` builds an APK with GitHub Actions. Download `OfflinePay-Wallet.apk` from the
repo's **Releases → latest** and install it (allow "install unknown apps").

1. On the laptop: `npm start`. It prints the **server address for the Android app**, e.g. `http://192.168.1.10:3000`.
2. Connect the phones to the same Wi-Fi or hotspot as the laptop.
3. Open the app, enter that address, and pick **PayA** or **PayB** for this phone (⚙ on the account screen changes it later).
4. Then use airplane mode (or the Online pill) for the offline part. Turn the network back on to settle.

Build it locally instead (needs JDK 21 + Android SDK): `npm run build:android`, then `cd android && ./gradlew assembleDebug`.

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
Wallet backend ── partner key ──► OfflinePay API (server/offlinepay-api.js)
      ▲                            issuer · settlement · fraud engine
      └────────── webhooks ───────┘
```

- `sdk/protocol.js` — shared crypto (ECDSA P-256 via WebCrypto, canonical JSON, token checks). Same code runs on phone and server.
- `sdk/offlinepay-sdk.js` — what a wallet embeds. Non-extractable device key, vault (balance, counter, hash chain), outbox sync.
- `server/offlinepay-api.js` — our product's API.
- `server/wallets.js` — mock PayA/PayB backends (ledger, KYC'd accounts, webhook handlers).
- `apps/wallet/` — wallet PWA (works offline via service worker). `apps/dashboard/` — partner console.

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

- Passwords are stored as salted **scrypt** hashes; sessions are random tokens (only their hash is stored), valid 30 days.
- Every wallet API acts on the signed-in user only, so a phone can only register and load Offline Pay for its own account.
- 5 wrong passwords lock that username for 1 minute.
- Once signed in, the app opens and pays offline; signing in itself needs a connection.

## Demo script (≈3 min, two phones)

Suggested setup: phone 1 = **customer** account on PayA, phone 2 = **merchant** account on PayB (cross-wallet payment).

1. Dashboard on the projector. Both phones: Offline Pay → Enable. Customer: load Rs 1,000.
2. **Airplane mode on both** (or tap the Online pill to simulate offline).
3. Customer: open *Demo: attack tools* → **Save vault snapshot**.
4. Merchant: Receive → Rs 200 → shows QR. Customer: Pay → scan → Approve → shows QR. Merchant: Scan payer's code → ✅ *Signature verified*.
5. **Tamper:** customer turns on "Tamper with next payment" and pays a new request → merchant scan → ❌ *Invalid signature*.
6. **Double-spend:** customer → **Roll back vault** (Rs 1,000 is back). Merchant makes a new Rs 900 request, customer pays, merchant verifies → ✅ (looks valid offline — this is the honest risk).
7. **Back online:** the merchant reconnects → dashboard: ✅ Rs 200 settled, PayA owes PayB Rs 200, and 🚩 the Rs 900 double-spend is blocked; the customer's device and account are frozen.

Reset between rehearsals: **Reset demo** on the dashboard (keeps accounts and passwords, restores balances), then **Reset this phone** on each phone.

## Honest limits of this demo
- The vault is in IndexedDB and enforced in software. Production needs hardware-backed keys and counters (Android StrongBox / iOS Secure Enclave); the protocol is designed for that.
- Double-spending is **detected and capped** (Rs 5,000 per device, KYC'd users), not prevented offline.
- QR codes are dense (~680 chars). Turn phone brightness up when scanning.
- Data (accounts, balances, sessions) is stored in `data/*.json` on the laptop. Delete that folder to start completely fresh.
- The dashboard and its reset button have no login — it is meant for the presenter's laptop.
