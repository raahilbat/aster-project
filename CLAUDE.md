# Aster Health — CLAUDE.md

Project context and decisions for AI-assisted development.

---

## What this project is

A browser-based diabetes and autoimmune disease risk assessment app built with React + Vite.
Users answer a 30-question health questionnaire, get a risk score, compare against population data,
and optionally connect a CGM device (Dexcom or FreeStyle Libre) for glucose monitoring.

All data is stored in **localStorage only**. Nothing is sent to any server except Dexcom OAuth token exchange.

---

## Running the project

```bash
# Frontend only
npm run dev                  # http://localhost:5173

# Frontend + Dexcom OAuth proxy (needed for Dexcom integration)
npm run dev                  # Terminal 1
npm run server               # Terminal 2  (node --env-file=.env server.js)
```

---

## Architecture

```
src/
  pages/          — Route-level components (one per page)
  components/     — Shared chart + UI components
  utils/
    riskEngine.js — Risk scoring algorithms (FINDRISC-based)
    cgmParser.js  — Libre CSV parser, Dexcom JSON parser, CGM metrics
    dexcomApi.js  — Dexcom API v3 client (OAuth2 + PKCE, token refresh, all endpoints)

server.js         — Node HTTP proxy: adds client_secret to Dexcom token exchange
                    Runs on port 3001. Only handles POST /api/dexcom/token.
```

### Data flow

```
Questionnaire → localStorage (asterFormData)
Lab reports   → localStorage (asterLabData)
CGM readings  → localStorage (asterCGMData)
Dexcom tokens → localStorage (dexcom_access_token, dexcom_refresh_token, dexcom_token_expiry)
```

---

## Dexcom integration — key decisions

### OAuth2 grant type
Dexcom **only supports Authorization Code grant** — no client credentials (system-to-system) flow.
This is a HIPAA/privacy decision: glucose data is PHI and requires explicit patient consent.

Do not attempt to call Dexcom without a user-issued access_token. It will always return 401.

### Why there is a proxy server
Dexcom requires `client_secret` in the token exchange request.
Secrets cannot live in the browser, so `server.js` holds `DEXCOM_CLIENT_SECRET` (from `.env`)
and adds it to the token request. The frontend handles everything else directly.

```
Browser → POST /api/dexcom/token (proxy) → sandbox-api.dexcom.com/v2/oauth2/token
Browser → GET  /v3/users/self/egvs       → sandbox-api.dexcom.com  (direct, no proxy)
```

Glucose data never passes through the proxy.

### PKCE
We use PKCE (Proof Key for Code Exchange) alongside `client_secret` as an extra security layer.
The `code_verifier` is stored in `sessionStorage` during the redirect and cleared after use.

### Token lifecycle
- Access token: short-lived (2 hours). Auto-refreshed in `dexcomApi.js` before expiry.
- Refresh token: long-lived (up to 6 months). Stored in localStorage.
- After one user login, the system can silently refresh and sync without user interaction.

### User identity
There is no explicit `userId` parameter in Dexcom API calls.
The `/v3/users/self/` path means "the user whose access_token this is."
User identity is encoded in the token by Dexcom at login time.

### Sandbox vs production
`DEXCOM_BASE` in `dexcomApi.js` is set to `https://sandbox-api.dexcom.com`.
To go to production, change it to `https://api.dexcom.com` and update credentials in `.env`.

### Sandbox test users
No password is required. Dexcom shows a dropdown to select the user.
Authorization code is static per sandbox user (not the case in production).

| Username | Device              | Notes                              |
|----------|---------------------|------------------------------------|
| User7    | G7 Mobile App       | Latest G7 data patterns            |
| User8    | ONE+ Mobile App     | Dexcom ONE+ device                 |
| User6    | G6 Mobile App       | Standard G6 phone upload           |
| User4    | G6 Touchscreen Receiver | Uploads once per sensor session |

- Data repeats every 10 days (sensor session length).
- Use `GET /v3/users/self/dataRange` to check each user's available date range.
- Insulin and carb events are populated for all users.
- Includes backfill, signal loss, and non-nominal states for realistic testing.
- Re-connecting the same sandbox user shows the HIPAA consent page again (not so in production).

### Multi-user support (not yet implemented)
Currently tokens are stored in a single localStorage slot (one user per browser).
For multi-user: key all token storage by an internal `userId`:
  `dexcom_access_token_${userId}`, `dexcom_refresh_token_${userId}`, etc.

### Backend-driven sync pattern (not yet implemented)
For a true server-side scheduled sync (e.g. nightly cron):
1. After user's one-time OAuth login, store `refresh_token` encrypted in your DB.
2. Cron job: `refresh_token → new access_token → GET /v3/users/self/egvs → store in DB`.
3. App reads from your DB — fully system-to-system after the initial consent.

---

## Dexcom API v3 endpoints used

| Endpoint | What it returns |
|---|---|
| `GET /v3/users/self/egvs` | Glucose readings every 5 min (EGVs) |
| `GET /v3/users/self/devices` | Device model, serial number, last upload date |
| `GET /v3/users/self/statistics` | TIR, mean, SD, GMI — computed by Dexcom |
| `GET /v3/users/self/dataRange` | Start/end timestamps of available data |
| `GET /v3/users/self/events` | Meals, insulin doses, exercise, health events |

All calls go through the proxy (`GET /api/dexcom/data?path=...`) because Dexcom blocks direct
browser requests (no CORS headers). The proxy forwards the `Authorization` header to Dexcom.

`syncAll()` uses `Promise.allSettled` — individual endpoint failures log a warning but don't abort
the sync. Only `/egvs` failing throws. `/statistics` returns 404 in sandbox for some users — this is expected.

Docs: https://developer.dexcom.com/docs/swaggerv3

---

## Risk scoring

- **T2D risk**: FINDRISC-adapted. 9 weighted factors → raw score → risk band (Low / Slightly Elevated / Moderate / High / Very High).
- **T1D / autoimmune risk**: Separate score based on autoimmune markers, family history, symptom pattern.
- **Lab values** (HbA1c, fasting glucose) override symptom-based estimate when entered and higher.
- Score thresholds and CDC prevalence data are in `src/utils/riskEngine.js` and are not fetched from any API.

---

## CGM data sources

| Source | Method | Parser |
|---|---|---|
| FreeStyle Libre | CSV file upload from LibreView.com | `parseLibreCSV()` in `cgmParser.js` |
| Dexcom | OAuth2 API (sandbox) | `parseDexcomData()` / `syncAll()` in `dexcomApi.js` |
| Nightscout | REST API (user provides URL) | Not yet implemented |
| Demo | Generated in-browser | `generateDemoReadings()` in `cgmParser.js` |

Libre CSV Record Type 0 = automatic historic reading (every 15 min), Type 1 = manual scan.
All sources normalise to the same shape: `{ timestamp, glucoseMgdl, glucoseMmol, source }`.

---

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_DEXCOM_CLIENT_ID` | `.env` (browser-safe) | Dexcom app client ID — used to build auth URL |
| `DEXCOM_CLIENT_SECRET` | `.env` (server-only) | Never sent to browser — proxy adds it to token requests |
| `FRONTEND_ORIGIN` | `.env` (optional) | CORS allowed origin for proxy (default: `http://localhost:5173`) |

---

## What is not implemented yet

- Nightscout live fetch
- Dexcom PKCE without client_secret (Dexcom currently requires client_secret even with PKCE)
- Multi-user token storage
- Backend scheduled sync (cron + DB)
- Fitbit / Apple HealthKit integration
- PDF export of risk report
- Retake history / risk trend over time
