// Netlify Function — Dexcom OAuth token exchange
// Runs on Netlify's servers (not the user's browser), so client_secret stays safe.
// Set DEXCOM_CLIENT_SECRET in Netlify dashboard → Site Settings → Environment Variables

const DEXCOM_TOKEN_URL = 'https://sandbox-api.dexcom.com/v2/oauth2/token'
const CLIENT_SECRET = process.env.DEXCOM_CLIENT_SECRET || ''

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'method_not_allowed' }) }
  }

  if (!CLIENT_SECRET) {
    return {
      statusCode: 503, headers: CORS,
      body: JSON.stringify({ error: 'DEXCOM_CLIENT_SECRET not set — add it in Netlify → Site Settings → Environment Variables' }),
    }
  }

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'invalid_json' }) } }

  const { grantType = 'authorization_code', clientId, code, redirectUri, codeVerifier, refreshToken } = body

  const params = new URLSearchParams({
    client_id:     clientId,
    client_secret: CLIENT_SECRET,
    grant_type:    grantType,
  })

  if (grantType === 'authorization_code') {
    if (!code || !redirectUri) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing code or redirectUri' }) }
    }
    params.set('code', code)
    params.set('redirect_uri', redirectUri)
    if (codeVerifier) params.set('code_verifier', codeVerifier)
  } else if (grantType === 'refresh_token') {
    if (!refreshToken) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing refresh_token' }) }
    }
    params.set('refresh_token', refreshToken)
  }

  try {
    const res  = await fetch(DEXCOM_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params,
    })
    const data = await res.json()
    return { statusCode: res.status, headers: CORS, body: JSON.stringify(data) }
  } catch (err) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: err.message }) }
  }
}
