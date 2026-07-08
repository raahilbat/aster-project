// Dexcom OAuth2 proxy server
// Keeps DEXCOM_CLIENT_SECRET off the browser while the frontend handles everything else.
//
// Run: node --env-file=.env server.js
// Or:  npm run server

import { createServer } from 'http'

const PORT = 3001
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

// Dexcom sandbox — swap to 'https://api.dexcom.com' for production
const DEXCOM_BASE      = 'https://sandbox-api.dexcom.com'
const DEXCOM_TOKEN_URL = `${DEXCOM_BASE}/v2/oauth2/token`

const CLIENT_SECRET = process.env.DEXCOM_CLIENT_SECRET || ''

// ── Helpers ───────────────────────────────────────────────

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function json(res, status, data) {
  setCORS(res)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => (raw += chunk))
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) }
      catch { reject(new Error('Invalid JSON body')) }
    })
    req.on('error', reject)
  })
}

// ── Server ────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  setCORS(res)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // POST /api/dexcom/token
  // Handles both authorization_code exchange and refresh_token grant.
  // The client sends everything except client_secret — we add it here.
  if (req.method === 'POST' && req.url === '/api/dexcom/token') {
    if (!CLIENT_SECRET) {
      return json(res, 503, {
        error: 'server_misconfigured',
        error_description: 'DEXCOM_CLIENT_SECRET is not set in .env — see .env.example',
      })
    }

    let body
    try { body = await readBody(req) }
    catch (e) { return json(res, 400, { error: 'bad_request', error_description: e.message }) }

    const { grantType = 'authorization_code', code, redirectUri, codeVerifier, refreshToken } = body

    const params = new URLSearchParams({
      client_id:     body.clientId,
      client_secret: CLIENT_SECRET,
      grant_type:    grantType,
    })

    if (grantType === 'authorization_code') {
      if (!code)        return json(res, 400, { error: 'missing_code' })
      if (!redirectUri) return json(res, 400, { error: 'missing_redirect_uri' })
      params.set('code', code)
      params.set('redirect_uri', redirectUri)
      if (codeVerifier) params.set('code_verifier', codeVerifier)
    } else if (grantType === 'refresh_token') {
      if (!refreshToken) return json(res, 400, { error: 'missing_refresh_token' })
      params.set('refresh_token', refreshToken)
    } else {
      return json(res, 400, { error: 'unsupported_grant_type' })
    }

    try {
      const dexRes = await fetch(DEXCOM_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      })
      const data = await dexRes.json()
      return json(res, dexRes.status, data)
    } catch (err) {
      return json(res, 502, { error: 'upstream_error', error_description: err.message })
    }
  }

  // GET /api/who-diabetes — proxies WHO GHO diabetes prevalence API for local dev
  if (req.method === 'GET' && req.url === '/api/who-diabetes') {
    try {
      const url = 'https://ghoapi.azureedge.net/api/NCD_DIABETES_PREVALENCE_AGESTD'
        + '?$filter=SpatialDimType eq \'COUNTRY\' and TimeDim eq 2022 and Dim1 eq \'SEX_BTSX\''
        + '&$select=SpatialDim,ParentLocationCode,ParentLocation,NumericValue,Value'
      const whoRes  = await fetch(encodeURI(url))
      const whoJson = await whoRes.json()
      const REGION_NAMES = { AFR:'Africa', AMR:'Americas', EMR:'Eastern Mediterranean', EUR:'Europe', SEAR:'South-East Asia', WPR:'Western Pacific' }
      const seen = new Set()
      const countries = (whoJson.value || [])
        .filter(r => r.NumericValue != null && !seen.has(r.SpatialDim) && seen.add(r.SpatialDim))
        .map(r => ({ code: r.SpatialDim, regionCode: r.ParentLocationCode, region: REGION_NAMES[r.ParentLocationCode] || r.ParentLocation, prevalence: parseFloat(r.NumericValue.toFixed(2)) }))
        .sort((a, b) => b.prevalence - a.prevalence)
      const byRegion = {}
      countries.forEach(c => { if (!byRegion[c.regionCode]) byRegion[c.regionCode] = { name: c.region, values: [] }; byRegion[c.regionCode].values.push(c.prevalence) })
      const regions = Object.entries(byRegion).map(([code, r]) => ({ regionCode: code, region: r.name, avg: parseFloat((r.values.reduce((s,v)=>s+v,0)/r.values.length).toFixed(2)), count: r.values.length })).sort((a,b)=>b.avg-a.avg)
      return json(res, 200, { source:'WHO Global Health Observatory', indicator:'NCD_DIABETES_PREVALENCE_AGESTD', year:2022, total:countries.length, countries, regions })
    } catch (err) {
      return json(res, 502, { error: err.message })
    }
  }

  // GET /api/dexcom/data?path=/v3/users/self/egvs&startDate=...
  // Generic proxy for all Dexcom API calls — forwards Authorization header.
  // Required because Dexcom doesn't set CORS headers for browser requests.
  if (req.method === 'GET' && req.url.startsWith('/api/dexcom/data')) {
    const authorization = req.headers['authorization']
    if (!authorization) return json(res, 401, { error: 'missing_authorization' })

    const reqUrl   = new URL(req.url, `http://localhost:${PORT}`)
    const dexPath  = reqUrl.searchParams.get('path')
    if (!dexPath) return json(res, 400, { error: 'missing_path' })

    // Forward all query params except 'path' to Dexcom
    const dexUrl = new URL(`${DEXCOM_BASE}${dexPath}`)
    reqUrl.searchParams.forEach((v, k) => {
      if (k !== 'path') dexUrl.searchParams.set(k, v)
    })

    try {
      const dexRes = await fetch(dexUrl.toString(), {
        headers: { Authorization: authorization },
      })
      const data = await dexRes.json()
      return json(res, dexRes.status, data)
    } catch (err) {
      return json(res, 502, { error: 'upstream_error', error_description: err.message })
    }
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, {
      ok: true,
      clientSecretSet: !!CLIENT_SECRET,
      dexcomEndpoint: DEXCOM_TOKEN_URL,
    })
  }

  json(res, 404, { error: 'not_found' })
})

server.listen(PORT, () => {
  const secretOk = CLIENT_SECRET ? '✓ set' : '✗ MISSING — add to .env'
  console.log(`\n  Dexcom OAuth proxy  →  http://localhost:${PORT}`)
  console.log(`  Client secret:         ${secretOk}`)
  console.log(`  Dexcom endpoint:       ${DEXCOM_TOKEN_URL}`)
  console.log(`  Allowed origin:        ${ALLOWED_ORIGIN}`)
  console.log(`\n  Register your redirect URI at developer.dexcom.com as:`)
  console.log(`  ${ALLOWED_ORIGIN}/cgm\n`)
})
