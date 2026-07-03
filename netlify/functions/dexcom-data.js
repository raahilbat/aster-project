// Netlify Function — Dexcom API proxy
// Forwards requests to Dexcom with the user's Bearer token.
// Required because Dexcom doesn't set CORS headers for browser requests.

const DEXCOM_BASE = 'https://sandbox-api.dexcom.com'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' }
  }

  const authorization = event.headers['authorization']
  if (!authorization) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'missing_authorization' }) }
  }

  const path = event.queryStringParameters?.path
  if (!path) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'missing_path param' }) }
  }

  const dexUrl = new URL(`${DEXCOM_BASE}${path}`)
  Object.entries(event.queryStringParameters || {}).forEach(([k, v]) => {
    if (k !== 'path') dexUrl.searchParams.set(k, v)
  })

  try {
    const res  = await fetch(dexUrl.toString(), {
      headers: { Authorization: authorization },
    })
    const data = await res.json()
    return { statusCode: res.status, headers: CORS, body: JSON.stringify(data) }
  } catch (err) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: err.message }) }
  }
}
