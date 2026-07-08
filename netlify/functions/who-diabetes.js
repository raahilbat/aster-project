// Netlify Function — WHO GHO API proxy for diabetes prevalence data
// Indicator: NCD_DIABETES_PREVALENCE_AGESTD (age-standardized, both sexes, 2022)
// Docs: https://www.who.int/data/gho/info/gho-odata-api

const WHO_BASE = 'https://ghoapi.azureedge.net/api'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
}

// WHO region codes → readable names
const REGION_NAMES = {
  AFR:  'Africa',
  AMR:  'Americas',
  EMR:  'Eastern Mediterranean',
  EUR:  'Europe',
  SEAR: 'South-East Asia',
  WPR:  'Western Pacific',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' }
  }

  try {
    // Fetch age-standardized prevalence for all countries, 2022, both sexes
    const url = `${WHO_BASE}/NCD_DIABETES_PREVALENCE_AGESTD`
      + `?$filter=SpatialDimType eq 'COUNTRY' and TimeDim eq 2022 and Dim1 eq 'SEX_BTSX'`
      + `&$select=SpatialDim,ParentLocationCode,ParentLocation,NumericValue,Value`

    const res  = await fetch(encodeURI(url))
    if (!res.ok) throw new Error(`WHO API returned ${res.status}`)

    const json = await res.json()
    const raw  = json.value || []

    // Deduplicate by country (some appear twice with different age groups)
    const seen = new Set()
    const countries = raw
      .filter(r => r.NumericValue != null && !seen.has(r.SpatialDim) && seen.add(r.SpatialDim))
      .map(r => ({
        code:         r.SpatialDim,
        regionCode:   r.ParentLocationCode,
        region:       REGION_NAMES[r.ParentLocationCode] || r.ParentLocation || r.ParentLocationCode,
        prevalence:   parseFloat(r.NumericValue.toFixed(2)),
      }))
      .sort((a, b) => b.prevalence - a.prevalence)

    // Compute regional averages from actual country data
    const byRegion = {}
    countries.forEach(c => {
      if (!byRegion[c.regionCode]) byRegion[c.regionCode] = { name: c.region, values: [] }
      byRegion[c.regionCode].values.push(c.prevalence)
    })
    const regions = Object.entries(byRegion).map(([code, r]) => ({
      regionCode: code,
      region:     r.name,
      avg:        parseFloat((r.values.reduce((s, v) => s + v, 0) / r.values.length).toFixed(2)),
      count:      r.values.length,
    })).sort((a, b) => b.avg - a.avg)

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        source:    'WHO Global Health Observatory',
        indicator: 'NCD_DIABETES_PREVALENCE_AGESTD',
        year:      2022,
        total:     countries.length,
        countries,
        regions,
      }),
    }
  } catch (err) {
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
