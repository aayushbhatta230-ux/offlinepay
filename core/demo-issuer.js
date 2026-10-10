// Fixed issuer key shared by every copy of the app in standalone (phone-only) mode, so phones
// can verify each other's certificates without a server. DEMO ONLY: anyone with the APK has this key.
// The server mode generates its own secret key instead.
export const DEMO_ISSUER = {
  "pub": {
    "x": "ZAZgGF0pPyi0t352eA3iIMHMI724atvVd_dL793ZpYA",
    "y": "hDxrUCXB2hpfkQuUFcPH_ClqScRCMWa5huI5AnaYKfs"
  },
  "priv": {
    "key_ops": [
      "sign"
    ],
    "ext": true,
    "kty": "EC",
    "x": "ZAZgGF0pPyi0t352eA3iIMHMI724atvVd_dL793ZpYA",
    "y": "hDxrUCXB2hpfkQuUFcPH_ClqScRCMWa5huI5AnaYKfs",
    "crv": "P-256",
    "d": "KtTTB2xaBsGnwv0IXjhH_iLMNjK3zwr4-t5NrRk3610"
  }
};
