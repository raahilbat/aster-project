// Dexcom Developer API v3 — sandbox integration
// Docs: https://developer.dexcom.com/docs/swaggerv3
//
// OAuth2 flow (Authorization Code + PKCE):
//   1. initiateAuth()       → redirects browser to Dexcom login
//   2. handleCallback(code) → proxy exchanges code+PKCE for tokens
//   3. syncAll()            → fetches EGVs, devices, stats, events
//
// Tokens are stored in localStorage and auto-refreshed before expiry.

const SANDBOX_BASE = 'https://sandbox-api.dexcom.com'

// Switch to 'https://api.dexcom.com' for production
const DEXCOM_BASE = SANDBOX_BASE

// Dev:  local proxy server on port 3001  →  /api/dexcom/token  /api/dexcom/data
// Prod: Netlify Functions native path    →  /.netlify/functions/dexcom-token etc.
const PROXY_TOKEN = import.meta.env.DEV
  ? 'http://localhost:3001/api/dexcom/token'
  : '/.netlify/functions/dexcom-token'

const PROXY_DATA = import.meta.env.DEV
  ? 'http://localhost:3001/api/dexcom/data'
  : '/.netlify/functions/dexcom-data'

const REDIRECT_URI = `${window.location.origin}/cgm`

const STORAGE = {
  access:  'dexcom_access_token',
  refresh: 'dexcom_refresh_token',
  expiry:  'dexcom_token_expiry',
  devices: 'dexcom_devices',
}

// ── PKCE ─────────────────────────────────────────────────

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function generatePKCE() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const verifier  = b64url(bytes)
  const digest    = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = b64url(digest)
  return { verifier, challenge }
}

// ── Token storage ─────────────────────────────────────────

function storeTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem(STORAGE.access,  access_token)
  localStorage.setItem(STORAGE.refresh, refresh_token)
  localStorage.setItem(STORAGE.expiry,  String(Date.now() + expires_in * 1000))
}

export function getStoredTokens() {
  return {
    accessToken:  localStorage.getItem(STORAGE.access),
    refreshToken: localStorage.getItem(STORAGE.refresh),
    expiresAt:    parseInt(localStorage.getItem(STORAGE.expiry) || '0'),
  }
}

export function isConnected() {
  return !!localStorage.getItem(STORAGE.access)
}

function isAccessTokenFresh() {
  const { accessToken, expiresAt } = getStoredTokens()
  return !!accessToken && Date.now() < expiresAt - 60_000   // 1-min buffer
}

export function disconnect() {
  Object.values(STORAGE).forEach(k => localStorage.removeItem(k))
  localStorage.removeItem('asterCGMData')
}

// ── OAuth2 — popup flow ───────────────────────────────────
// Opens Dexcom login in a small popup window.
// The popup lands back on /cgm?code=xxx, detects window.opener,
// sends the code via postMessage, and closes itself.
// The parent window never navigates away.

export function initiateAuthPopup(clientId) {
  if (!clientId) throw new Error('VITE_DEXCOM_CLIENT_ID is not set — copy .env.example to .env')

  return new Promise(async (resolve, reject) => {
    const { verifier, challenge } = await generatePKCE()
    sessionStorage.setItem('dexcom_pkce_verifier', verifier)

    const params = new URLSearchParams({
      client_id:             clientId,
      redirect_uri:          REDIRECT_URI,
      response_type:         'code',
      scope:                 'offline_access',
      code_challenge:        challenge,
      code_challenge_method: 'S256',
    })

    const popup = window.open(
      `${DEXCOM_BASE}/v2/oauth2/login?${params}`,
      'dexcom_auth',
      'width=500,height=660,scrollbars=yes,resizable=yes,left=200,top=100',
    )

    if (!popup) {
      reject(new Error('Popup blocked — please allow popups for localhost:5173 and try again.'))
      return
    }

    // Receive the auth code from the popup via postMessage
    function onMessage(event) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'dexcom_oauth_code') return
      cleanup()
      if (event.data.error) reject(new Error(event.data.error))
      else resolve(event.data.code)
    }

    // Detect if user closed popup manually
    const closePoll = setInterval(() => {
      if (popup.closed) { cleanup(); reject(new Error('Dexcom login was closed')) }
    }, 600)

    // Safety timeout — 5 minutes
    const timeout = setTimeout(() => {
      cleanup()
      if (!popup.closed) popup.close()
      reject(new Error('Dexcom login timed out after 5 minutes'))
    }, 5 * 60 * 1000)

    function cleanup() {
      clearInterval(closePoll)
      clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
    }

    window.addEventListener('message', onMessage)
  })
}

// ── OAuth2 callback ───────────────────────────────────────

export async function handleCallback(code, clientId) {
  const verifier = sessionStorage.getItem('dexcom_pkce_verifier')
  sessionStorage.removeItem('dexcom_pkce_verifier')

  const res = await fetch(PROXY_TOKEN, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      code,
      redirectUri:  REDIRECT_URI,
      codeVerifier: verifier,
    }),
  })

  const data = await res.json()

  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || `Token exchange failed (${res.status})`)
  }

  storeTokens(data)
  return data
}

// ── Token refresh ─────────────────────────────────────────

async function doRefresh(clientId) {
  const { refreshToken } = getStoredTokens()
  if (!refreshToken) throw new Error('No refresh token — please reconnect.')

  const res = await fetch(PROXY_TOKEN, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, grantType: 'refresh_token', refreshToken }),
  })

  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error_description || 'Token refresh failed')
  storeTokens(data)
  return data.access_token
}

async function validToken(clientId) {
  if (isAccessTokenFresh()) return getStoredTokens().accessToken
  return doRefresh(clientId)
}

// ── API fetch wrapper ─────────────────────────────────────
// All Dexcom API calls go through the proxy (GET /api/dexcom/data?path=...)
// because Dexcom doesn't set CORS headers — direct browser requests are blocked.

async function dexFetch(path, params = {}, clientId = '') {
  const token = await validToken(clientId)

  // Use window.location.origin as base so relative paths like /.netlify/functions/...
  // are resolved correctly. Absolute URLs (localhost:3001) work the same way.
  const proxyUrl = new URL(PROXY_DATA, window.location.origin)
  proxyUrl.searchParams.set('path', path)
  Object.entries(params).forEach(([k, v]) => proxyUrl.searchParams.set(k, String(v)))

  const doFetch = (t) => fetch(proxyUrl.toString(), {
    headers: { Authorization: `Bearer ${t}` },
  })

  let res = await doFetch(token)

  // One automatic retry after refresh on 401
  if (res.status === 401) {
    const newToken = await doRefresh(clientId)
    res = await doFetch(newToken)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg  = body.errors?.[0]?.message || body.error_description || body.error || `Dexcom ${res.status}`
    const err  = new Error(msg)
    err.status = res.status
    throw err
  }

  return res.json()
}

function isoRange(days) {
  const end   = new Date()
  const start = new Date(end - days * 86_400_000)
  const fmt   = d => d.toISOString().slice(0, 19)   // YYYY-MM-DDTHH:MM:SS
  return { startDate: fmt(start), endDate: fmt(end) }
}

// ── Individual endpoints ──────────────────────────────────

// GET /v3/users/self/egvs — estimated glucose values every 5 min
export async function fetchEGVs(clientId, days = 14) {
  return dexFetch('/v3/users/self/egvs', isoRange(days), clientId)
}

// GET /v3/users/self/devices — device serial, model, last upload date
export async function fetchDevices(clientId) {
  return dexFetch('/v3/users/self/devices', {}, clientId)
}

// GET /v3/users/self/dataRange — start/end timestamps of available data
export async function fetchDataRange(clientId) {
  return dexFetch('/v3/users/self/dataRange', {}, clientId)
}

// GET /v3/users/self/events — meals, insulin doses, exercise, health events
export async function fetchEvents(clientId, days = 14) {
  return dexFetch('/v3/users/self/events', isoRange(days), clientId)
}

// ── Full sync ─────────────────────────────────────────────
// Uses Promise.allSettled so a 404 on one endpoint (e.g. /statistics
// not available in sandbox) doesn't abort the whole sync.

function settled(result) {
  return result.status === 'fulfilled' ? result.value : null
}

export async function syncAll(clientId) {
  // Step 1 — get the actual available date range for this sandbox user.
  // Sandbox data is fixed (not live), so requesting "the last 14 days"
  // often returns nothing because those dates have no data.
  // We use dataRange to find the real end date, then step back 14 days from there.
  let rangeData = null
  try {
    rangeData = await fetchDataRange(clientId)
    console.log('[Dexcom] dataRange:', JSON.stringify(rangeData))
  } catch (err) {
    console.warn('[Dexcom] dataRange failed:', err.message)
  }

  // Build date params from the actual available range, not "now"
  function egvDateRange() {
    const egvRange = rangeData?.egvs
    if (egvRange?.end?.systemTime) {
      const end   = new Date(egvRange.end.systemTime)
      const start = new Date(Math.max(
        new Date(egvRange.start?.systemTime || 0).getTime(),
        end.getTime() - 14 * 86_400_000,
      ))
      const fmt = d => d.toISOString().slice(0, 19)
      return { startDate: fmt(start), endDate: fmt(end) }
    }
    // Fallback to last 14 days if dataRange unavailable
    return isoRange(14)
  }

  const egvParams = egvDateRange()
  console.log('[Dexcom] fetching EGVs with params:', egvParams)

  // Step 2 — fetch EGVs, devices and events in parallel.
  // /statistics is excluded — returns 404 for most sandbox users.
  // TIR, mean, GMI and CV% are computed locally from EGV data instead.
  const results = await Promise.allSettled([
    dexFetch('/v3/users/self/egvs',    egvParams, clientId),
    dexFetch('/v3/users/self/devices', {},        clientId),
    dexFetch('/v3/users/self/events',  egvParams, clientId),
  ])

  const names = ['egvs', 'devices', 'events']
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[Dexcom] /${names[i]} failed:`, r.reason?.message)
    } else {
      console.log(`[Dexcom] /${names[i]} OK`)
    }
  })

  const [egvData, deviceData, eventData] = results.map(settled)

  // EGVs are required — devices and events are optional
  // G6 uses { egvs: [...] }, G7 uses { records: [...] }
  const rawEGVs = egvData?.records ?? egvData?.egvs ?? null

  if (!rawEGVs) {
    const detail = results[0].reason?.message || 'response had no records or egvs array'
    console.error('[Dexcom] EGVs parse failed — response keys:', egvData ? Object.keys(egvData) : 'null')
    throw new Error(`Could not load glucose data: ${detail}`)
  }

  console.log(`[Dexcom] ${rawEGVs.length} EGV readings received`)

  // Normalise EGVs → our standard reading shape
  const readings = rawEGVs.map(r => ({
    timestamp:   new Date(r.displayTime || r.systemTime),
    glucoseMgdl: Number(r.value),
    glucoseMmol: parseFloat((r.value / 18.0182).toFixed(1)),
    trend:       r.trend,      // 'flat' | 'fortyFiveDown' | 'singleUp' etc.
    trendRate:   r.trendRate,  // mg/dL/min
    source:      'dexcom',
  })).filter(r => !isNaN(r.glucoseMgdl))

  localStorage.setItem('asterCGMData',  JSON.stringify(readings))
  localStorage.setItem(STORAGE.devices, JSON.stringify(deviceData?.devices || []))

  return { readings, deviceData, rangeData, eventData, egvDateRange: egvParams }
}

// ── Trend arrow helper ────────────────────────────────────

export function trendArrow(trend) {
  const map = {
    flat:             '→',
    fortyFiveUp:      '↗',
    singleUp:         '↑',
    doubleUp:         '↑↑',
    fortyFiveDown:    '↘',
    singleDown:       '↓',
    doubleDown:       '↓↓',
    notComputable:    '?',
    rateOutOfRange:   '!',
  }
  return map[trend] || '—'
}
