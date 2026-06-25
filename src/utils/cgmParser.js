// CGM data parsing for FreeStyle Libre (CSV) and Dexcom (API/JSON)

// ── FreeStyle Libre CSV parser ────────────────────────────
// LibreView export format:
// Columns: "Device Timestamp","Record Type","Historic Glucose mmol/L","Scan Glucose mmol/L",...

export function parseLibreCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const readings = [];

  // Skip header rows (LibreView puts metadata in first few rows)
  let dataStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('device timestamp')) {
      dataStart = i + 1;
      break;
    }
  }

  for (let i = dataStart; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
    if (cols.length < 3) continue;

    const timestamp = cols[0];
    const recordType = parseInt(cols[1]);
    const historicGlucose = cols[2]; // mmol/L
    const scanGlucose = cols[3] || '';

    // Record type 0 = automatic historic reading, 1 = manual scan
    if (recordType !== 0 && recordType !== 1) continue;

    const glucoseMmol = parseFloat(historicGlucose || scanGlucose);
    if (isNaN(glucoseMmol)) continue;

    const glucoseMgdl = Math.round(glucoseMmol * 18.0182);
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) continue;

    readings.push({
      timestamp: date,
      glucoseMgdl,
      glucoseMmol: parseFloat(glucoseMmol.toFixed(1)),
      source: recordType === 0 ? 'historic' : 'scan',
    });
  }

  return readings.sort((a, b) => a.timestamp - b.timestamp);
}

// ── Dexcom JSON parser ────────────────────────────────────
// Dexcom API v3 response: { egvs: [{ systemTime, displayTime, value, trend, trendRate }] }

export function parseDexcomData(apiResponse) {
  const egvs = apiResponse?.egvs || apiResponse?.estimatedGlucoseValues || [];
  return egvs
    .map(r => ({
      timestamp: new Date(r.displayTime || r.systemTime),
      glucoseMgdl: parseInt(r.value),
      glucoseMmol: parseFloat((r.value / 18.0182).toFixed(1)),
      trend: r.trend,
      trendRate: r.trendRate,
      source: 'dexcom',
    }))
    .filter(r => !isNaN(r.glucoseMgdl) && !isNaN(r.timestamp.getTime()))
    .sort((a, b) => a.timestamp - b.timestamp);
}

// ── CGM metrics calculation ───────────────────────────────

export function calculateCGMMetrics(readings, unit = 'mgdl') {
  if (!readings || readings.length === 0) return null;

  const values = readings.map(r => r.glucoseMgdl);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  // Time-in-range (ADA targets)
  const inRange = values.filter(v => v >= 70 && v <= 180).length;
  const low = values.filter(v => v < 70).length;
  const high = values.filter(v => v > 180).length;

  const total = values.length;
  const tirPct = Math.round((inRange / total) * 100);
  const lowPct = Math.round((low / total) * 100);
  const highPct = Math.round((high / total) * 100);

  // Glucose Management Indicator (GMI) — ADA formula
  // GMI(%) = 3.31 + 0.02392 × mean glucose (mg/dL)
  const gmi = (3.31 + 0.02392 * avg).toFixed(1);

  // Coefficient of variation
  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length;
  const sd = Math.sqrt(variance);
  const cv = ((sd / avg) * 100).toFixed(1);

  return {
    avgMgdl: Math.round(avg),
    avgMmol: (avg / 18.0182).toFixed(1),
    gmi: parseFloat(gmi),
    cv: parseFloat(cv),
    tir: { inRange: tirPct, low: lowPct, high: highPct },
    sd: Math.round(sd),
    readingCount: total,
    daysOfData: Math.ceil(total / (24 * 4)), // ~1 reading per 15 min for Libre
  };
}

// ── Demo data generator ───────────────────────────────────
// Generates realistic 14-day CGM trace for demo/preview purposes

export function generateDemoReadings(riskLevel = 'Moderate') {
  const readings = [];
  const now = new Date();
  const baselines = {
    Low: 90, 'Slightly Elevated': 100, Moderate: 110, High: 130, 'Very High': 155,
  };
  const base = baselines[riskLevel] || 100;

  for (let day = 13; day >= 0; day--) {
    for (let hour = 0; hour < 24; hour++) {
      for (let min of [0, 15, 30, 45]) {
        const t = new Date(now);
        t.setDate(t.getDate() - day);
        t.setHours(hour, min, 0, 0);

        // Simulate meal spikes
        let spike = 0;
        if (hour === 8 && min < 60) spike = 35;
        else if (hour === 13 && min < 60) spike = 40;
        else if (hour === 19 && min < 60) spike = 45;

        // Simulate dawn phenomenon
        const dawn = hour >= 5 && hour <= 8 ? 8 : 0;

        const noise = (Math.random() - 0.5) * 18;
        const glucose = Math.max(65, Math.min(300, base + spike + dawn + noise));

        readings.push({
          timestamp: t,
          glucoseMgdl: Math.round(glucose),
          glucoseMmol: parseFloat((glucose / 18.0182).toFixed(1)),
          source: 'demo',
        });
      }
    }
  }

  return readings;
}

// ── Format for chart ──────────────────────────────────────

export function readingsToChartData(readings, lastNHours = 24) {
  const cutoff = new Date(Date.now() - lastNHours * 60 * 60 * 1000);
  const filtered = readings.filter(r => r.timestamp >= cutoff);

  return {
    labels: filtered.map(r => r.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    data: filtered.map(r => r.glucoseMgdl),
  };
}
