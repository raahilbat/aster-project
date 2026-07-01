import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import GlucoseChart from '../components/GlucoseChart'
import TIRChart from '../components/TIRChart'
import { parseLibreCSV, calculateCGMMetrics, readingsToChartData, generateDemoReadings } from '../utils/cgmParser'
import { calculateT2DRisk } from '../utils/riskEngine'
import {
  initiateAuthPopup, handleCallback, isConnected, disconnect,
  getStoredTokens, syncAll, trendArrow,
} from '../utils/dexcomApi'

const CLIENT_ID = import.meta.env.VITE_DEXCOM_CLIENT_ID || ''

// ── Helpers ───────────────────────────────────────────────

function buildMetricsAndChart(data) {
  const metrics   = calculateCGMMetrics(data)
  const chartData = readingsToChartData(data, 24)
  return { metrics, chartData }
}

// ── Sub-components ────────────────────────────────────────

function DataPreview({ readings, metrics, chartData, source }) {
  return (
    <div>
      <div className="cgm-result-preview" style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 12 }}>
          {source === 'dexcom' ? '🟢 Dexcom synced' : source === 'libre' ? '💙 Libre uploaded' : '🎭 Demo data loaded'}
          {' — '}{metrics.readingCount} readings · {metrics.daysOfData} day{metrics.daysOfData !== 1 ? 's' : ''}
        </h4>
        <div className="cgm-stats-mini">
          <div className="cgm-stat-mini">
            <div className="cgm-stat-val">{metrics.avgMgdl} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>mg/dL</span></div>
            <div className="cgm-stat-lbl">Average glucose</div>
          </div>
          <div className="cgm-stat-mini">
            <div className="cgm-stat-val" style={{ color: metrics.tir.inRange >= 70 ? 'var(--success)' : 'var(--warning)' }}>
              {metrics.tir.inRange}%
            </div>
            <div className="cgm-stat-lbl">Time in range</div>
          </div>
          <div className="cgm-stat-mini">
            <div className="cgm-stat-val" style={{ color: metrics.gmi >= 6.5 ? 'var(--danger)' : metrics.gmi >= 5.7 ? 'var(--warning)' : 'var(--success)' }}>
              {metrics.gmi}%
            </div>
            <div className="cgm-stat-lbl">Est. HbA1c (GMI)</div>
          </div>
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 20 }}>Glucose — Last 24 Hours</h2>
        <div style={{ height: 220 }}>
          <GlucoseChart chartData={chartData} />
        </div>
      </div>

      <div className="section-card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 20 }}>Time in Range</h2>
        <TIRChart tir={metrics.tir} />
      </div>
    </div>
  )
}

// ── Dexcom panel ──────────────────────────────────────────

function DexcomPanel({ onSync }) {
  const [status, setStatus]       = useState(() => isConnected() ? 'connected' : 'idle')
  const [syncing, setSyncing]     = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [error, setError]         = useState('')
  const [devices, setDevices]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('dexcom_devices') || '[]') } catch { return [] }
  })

  // No redirect-based callback handling needed — popup sends code via postMessage

  async function doSync() {
    setSyncing(true)
    setError('')
    try {
      const result = await syncAll(CLIENT_ID)
      const { metrics, chartData } = buildMetricsAndChart(result.readings)
      const devs = result.deviceData?.devices || []
      setDevices(devs)
      setSyncResult({ readings: result.readings, metrics, chartData, eventData: result.eventData })
      onSync({ readings: result.readings, metrics, chartData })
    } catch (err) {
      console.error('[Sync] failed:', err)
      setError(`${err.message} — check the browser console (F12) and proxy terminal for details.`)
    } finally {
      setSyncing(false)
    }
  }

  function handleConnect() {
    if (!CLIENT_ID) {
      setError('VITE_DEXCOM_CLIENT_ID is not set. Copy .env.example to .env and add your Dexcom client ID.')
      return
    }
    setError('')
    setStatus('connecting')

    initiateAuthPopup(CLIENT_ID)
      .then(code => {
        setStatus('exchanging')
        return handleCallback(code, CLIENT_ID)
      })
      .then(() => {
        setStatus('connected')
        return doSync()
      })
      .catch(err => {
        setError(err.message)
        setStatus('idle')
      })
  }

  function handleDisconnect() {
    disconnect()
    setSyncResult(null)
    setDevices([])
    setStatus('idle')
    setError('')
  }

  // ── Render helpers ─────────────────────────────────────

  const deviceCard = (d, i) => (
    <div key={i} style={{ padding: '14px 16px', background: 'var(--success-light)', border: '1px solid #6EE7B7', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ fontSize: '1.6rem' }}>📡</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          Dexcom {d.transmitterGeneration || d.displayDevice || 'CGM'}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
          S/N: {d.serialNumber || '—'} · Last upload: {d.lastUploadDate ? new Date(d.lastUploadDate).toLocaleDateString() : '—'}
        </div>
      </div>
    </div>
  )

  if (status === 'connecting' || status === 'exchanging') {
    const msg = status === 'connecting'
      ? { icon: '🔐', title: 'Dexcom login opened in a popup', sub: 'Select a sandbox user from the dropdown — no password needed' }
      : { icon: '⏳', title: 'Completing authorisation…',      sub: 'Exchanging auth code for access token via proxy' }
    return (
      <div className="cgm-action-area" style={{ textAlign: 'center', padding: '48px 32px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>{msg.icon}</div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{msg.title}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{msg.sub}</div>
      </div>
    )
  }

  if (status === 'connected') {
    return (
      <div>
        {/* Connected header */}
        <div className="cgm-action-area" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ color: 'var(--success)', marginBottom: 6 }}>✓ Dexcom Connected</h3>
              <p style={{ margin: 0 }}>
                {devices.length > 0
                  ? `${devices.length} device${devices.length > 1 ? 's' : ''} found. Tap Sync to pull the latest 14 days of glucose data.`
                  : 'Authorised. Tap Sync to pull the latest 14 days of glucose data.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-next"
                onClick={doSync}
                disabled={syncing}
                style={{ padding: '10px 20px', border: 'none', cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: syncing ? 0.7 : 1 }}
              >
                {syncing ? 'Syncing…' : '↻ Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'white', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Device list */}
          {devices.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {devices.map(deviceCard)}
            </div>
          )}

          {/* Sync progress */}
          {syncing && (
            <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <div style={{ width: 16, height: 16, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Fetching EGVs, devices, statistics, and events in parallel…
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--danger-light)', borderRadius: 'var(--radius)', color: '#991B1B', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}
        </div>

        {/* Data preview */}
        {syncResult && (
          <div style={{ marginTop: 24 }}>
            <DataPreview
              readings={syncResult.readings}
              metrics={syncResult.metrics}
              chartData={syncResult.chartData}
              source="dexcom"
            />

            {/* Events summary */}
            {syncResult.eventData?.events?.length > 0 && (
              <div className="section-card" style={{ marginBottom: 20 }}>
                <h2 style={{ marginBottom: 16 }}>Logged Events</h2>
                <EventsSummary events={syncResult.eventData.events} />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Idle / not connected
  return (
    <div className="cgm-action-area">
      <h3>Connect Dexcom G6 / G7</h3>
      <p>
        Uses the Dexcom sandbox API with OAuth2 + PKCE. Click Connect, choose a sandbox user from
        the dropdown — <strong>no password required</strong>.
      </p>

      <div className="dexcom-steps" style={{ marginBottom: 20 }}>
        <div className="dexcom-step">
          <div className="dexcom-step-num">1</div>
          <div className="dexcom-step-text">
            Register at <strong>developer.dexcom.com</strong> → create a sandbox app →
            set redirect URI to <code style={{ background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 4, fontSize: '0.82rem' }}>http://localhost:5173/cgm</code>
          </div>
        </div>
        <div className="dexcom-step">
          <div className="dexcom-step-num">2</div>
          <div className="dexcom-step-text">
            Copy <strong>.env.example → .env</strong> and add your Client ID and Client Secret.
            Start the proxy: <code style={{ background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 4 }}>npm run server</code>
          </div>
        </div>
        <div className="dexcom-step">
          <div className="dexcom-step-num">3</div>
          <div className="dexcom-step-text">
            Click <strong>Connect Dexcom</strong> — Dexcom shows a <strong>dropdown, no password needed</strong>.
            Pick any sandbox user. Use <strong>/dataRange</strong> to check what data each user has.
          </div>
        </div>
        <div className="dexcom-step">
          <div className="dexcom-step-num">4</div>
          <div className="dexcom-step-text">
            Aster syncs EGVs, devices, statistics, and events in parallel via
            <strong> GET /v3/users/self/egvs</strong>, <strong>/devices</strong>, <strong>/statistics</strong>, and <strong>/events</strong>.
            Each endpoint fails independently — the sync succeeds as long as EGVs load.
          </div>
        </div>
      </div>

      {/* Sandbox user reference table */}
      <div style={{ marginBottom: 20, background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ padding: '10px 16px', background: 'var(--primary-light)', borderBottom: '1px solid var(--border)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Sandbox Test Users — no password required
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              {['Username', 'Device', 'Data pattern'].map(h => (
                <th key={h} style={{ padding: '8px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { user: 'User7', device: 'G7 Mobile App',              pattern: 'Latest G7 data patterns' },
              { user: 'User8', device: 'ONE+ Mobile App',            pattern: 'Dexcom ONE+ device data' },
              { user: 'User6', device: 'G6 Mobile App',              pattern: 'Standard G6 phone upload' },
              { user: 'User4', device: 'G6 Touchscreen Receiver',    pattern: 'Receiver upload (once per session)' },
            ].map((row, i) => (
              <tr key={row.user} style={{ background: i % 2 === 0 ? 'white' : 'var(--bg)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--primary)' }}>{row.user}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{row.device}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{row.pattern}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '8px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
          Data repeats every 10 days (sensor session). Use GET /v3/users/self/dataRange to check each user's available date range.
        </div>
      </div>

      {!CLIENT_ID && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--warning-light)', border: '1px solid #FDE68A', borderRadius: 'var(--radius)', fontSize: '0.85rem', color: '#92400E' }}>
          <strong>⚠ VITE_DEXCOM_CLIENT_ID is not set.</strong> Copy <code>.env.example</code> to <code>.env</code> and add your Dexcom client ID to enable this button.
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--danger-light)', borderRadius: 'var(--radius)', color: '#991B1B', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn-dexcom" onClick={handleConnect} disabled={!CLIENT_ID} style={{ opacity: CLIENT_ID ? 1 : 0.5 }}>
          Connect Dexcom →
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        Sandbox endpoint: <code>sandbox-api.dexcom.com</code> · OAuth2 + PKCE · Tokens auto-refresh
      </div>
    </div>
  )
}

// ── Dexcom Stats display ──────────────────────────────────

function DexcomStats({ stats }) {
  const s = stats?.ninetyDayReadings || stats
  if (!s) return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No statistics available.</p>

  const tiles = [
    { label: 'Mean Glucose',      value: s.mean        ? `${Math.round(s.mean)} mg/dL`   : '—' },
    { label: 'Std Deviation',     value: s.stdDev       ? `${Math.round(s.stdDev)} mg/dL` : '—' },
    { label: 'CV%',               value: s.cv           ? `${s.cv.toFixed(1)}%`            : '—' },
    { label: 'Min',               value: s.min          ? `${s.min} mg/dL`                 : '—' },
    { label: 'Max',               value: s.max          ? `${s.max} mg/dL`                 : '—' },
    { label: 'GMI (est. HbA1c)', value: s.gmi          ? `${s.gmi.toFixed(1)}%`           : '—' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
      {tiles.map(t => (
        <div key={t.label} style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{t.label}</div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{t.value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Events summary ────────────────────────────────────────

function EventsSummary({ events }) {
  const byType = events.reduce((acc, e) => {
    acc[e.eventType] = (acc[e.eventType] || 0) + 1
    return acc
  }, {})

  const icons = { meal: '🍽', insulin: '💉', exercise: '🏃', health: '❤️' }

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {Object.entries(byType).map(([type, count]) => (
        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
          <span>{icons[type] || '📌'}</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{count} {type} event{count > 1 ? 's' : ''}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────

export default function CGMIntegration() {
  const [selected, setSelected] = useState(() => isConnected() ? 'dexcom' : null)
  const [readings, setReadings]  = useState(null)
  const [metrics, setMetrics]    = useState(null)
  const [chartData, setChartData] = useState(null)
  const [error, setError]        = useState('')
  const fileRef = useRef()
  const navigate = useNavigate()

  useEffect(() => {
    // ── Popup mode ───────────────────────────────────────────
    // When Dexcom redirects the popup back to /cgm?code=xxx,
    // send the code to the parent window and close the popup.
    if (window.opener) {
      const params = new URLSearchParams(window.location.search)
      window.opener.postMessage({
        type:  'dexcom_oauth_code',
        code:  params.get('code')  || null,
        error: params.get('error_description') || params.get('error') || null,
      }, window.location.origin)
      window.close()
      return  // nothing else to render — popup is closing
    }

    // ── Normal page load ─────────────────────────────────────
    const stored = localStorage.getItem('asterCGMData')
    if (stored) {
      try {
        const data = JSON.parse(stored).map(r => ({ ...r, timestamp: new Date(r.timestamp) }))
        if (data.length > 0) {
          const { metrics: m, chartData: cd } = buildMetricsAndChart(data)
          setReadings(data); setMetrics(m); setChartData(cd)
        }
      } catch { /* ignore */ }
    }
  }, [])

  function handleDexcomSync({ readings: r, metrics: m, chartData: cd }) {
    setReadings(r); setMetrics(m); setChartData(cd)
  }

  function handleLibreFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = parseLibreCSV(ev.target.result)
        if (parsed.length === 0) {
          setError('No valid readings found. Make sure this is a LibreView CSV export (Account → Reports → Export Raw Data).')
          return
        }
        const { metrics: m, chartData: cd } = buildMetricsAndChart(parsed)
        setReadings(parsed); setMetrics(m); setChartData(cd)
        localStorage.setItem('asterCGMData', JSON.stringify(parsed))
      } catch (err) {
        setError('Parse error: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  function handleDemo() {
    const formData = localStorage.getItem('asterFormData')
    let riskLevel = 'Moderate'
    if (formData) {
      const t2d = calculateT2DRisk(JSON.parse(formData))
      riskLevel = t2d.riskLevel
    }
    const demo = generateDemoReadings(riskLevel)
    const { metrics: m, chartData: cd } = buildMetricsAndChart(demo)
    setReadings(demo); setMetrics(m); setChartData(cd)
    localStorage.setItem('asterCGMData', JSON.stringify(demo))
  }

  const providers = [
    { id: 'dexcom',     logo: '🟢', name: 'Dexcom G6 / G7',    desc: 'OAuth2 API — live sync via sandbox' },
    { id: 'libre',      logo: '💙', name: 'FreeStyle Libre',    desc: 'Upload CSV export from LibreView.com' },
    // { id: 'nightscout', logo: '🌙', name: 'Nightscout',         desc: 'Self-hosted CGM aggregator (REST API)' },
    // { id: 'demo',       logo: '🎭', name: 'Demo Data',          desc: '14-day simulated trace, no device needed' },
  ]

  return (
    <div className="cgm-page">
      <h1>CGM Integration</h1>
      <p>Connect your continuous glucose monitor to see glucose trends, time-in-range, and an estimated HbA1c across your dashboard.</p>

      {/* Provider picker */}
      <div className="cgm-options">
        {providers.map(p => (
          <div
            key={p.id}
            className={`cgm-card ${selected === p.id ? 'selected' : ''}`}
            onClick={() => setSelected(p.id)}
          >
            <div className="cgm-card-logo">{p.logo}</div>
            <h3>{p.name}</h3>
            <p>{p.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Dexcom ── */}
      {selected === 'dexcom' && (
        <DexcomPanel onSync={handleDexcomSync} />
      )}

      {/* ── Libre ── */}
      {selected === 'libre' && (
        <div className="cgm-action-area">
          <h3>Upload FreeStyle Libre CSV</h3>
          <p>
            In <strong>LibreView.com</strong> → account → Reports → Export Raw Data → Download CSV.
            The parser reads Record Type 0 (historic, every 15 min) and Type 1 (manual scans), converts mmol/L → mg/dL.
          </p>
          <div className="file-upload-zone" onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleLibreFile} />
            <div className="upload-icon">📂</div>
            <div className="upload-text">Click to upload LibreView CSV</div>
            <div className="upload-hint">Libre 2 and Libre 3 exports supported</div>
          </div>
          {error && (
            <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--danger-light)', borderRadius: 'var(--radius)', color: '#991B1B', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* ── Nightscout ── */}
      {selected === 'nightscout' && (
        <div className="cgm-action-area">
          <h3>Connect Nightscout</h3>
          <p>Nightscout is an open-source CGM platform. If you self-host it, enter your URL and Aster will call <code>/api/v1/entries.json</code> to pull readings.</p>
          <div className="dexcom-steps" style={{ marginBottom: 20 }}>
            {[
              'Enter your Nightscout URL (e.g. https://yoursite.herokuapp.com)',
              'Aster calls GET /api/v1/entries.json?count=288 — the last 24 hours of readings.',
              'Nightscout supports Dexcom, FreeStyle Libre (via xDrip+), Medtronic and more.',
            ].map((t, i) => (
              <div key={i} className="dexcom-step">
                <div className="dexcom-step-num">{i + 1}</div>
                <div className="dexcom-step-text">{t}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input className="field-input" type="url" placeholder="https://your-nightscout.fly.dev" style={{ maxWidth: 360 }} />
            <button className="btn-next" style={{ padding: '12px 20px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Connect
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn-demo" onClick={handleDemo}>Load Demo Data Instead</button>
          </div>
        </div>
      )}

      {/* ── Demo ── */}
      {selected === 'demo' && !readings && (
        <div className="cgm-action-area">
          <h3>Demo CGM Data</h3>
          <p>Generates a realistic 14-day glucose trace calibrated to your questionnaire risk profile. All dashboard features work with demo data.</p>
          <button className="btn-demo" onClick={handleDemo}>Generate 14-Day Trace</button>
        </div>
      )}

      {/* ── Preview for non-Dexcom sources ── */}
      {readings && metrics && chartData && selected !== 'dexcom' && (
        <div style={{ marginTop: 24 }}>
          <DataPreview readings={readings} metrics={metrics} chartData={chartData} source={selected} />
          <button
            className="btn-primary"
            onClick={() => navigate('/dashboard')}
            style={{ border: 'none', cursor: 'pointer', textDecoration: 'none' }}
          >
            View Full Dashboard →
          </button>
        </div>
      )}

      {/* Navigate to dashboard if Dexcom data was loaded */}
      {readings && metrics && selected === 'dexcom' && (
        <div style={{ marginTop: 24 }}>
          <button
            className="btn-primary"
            onClick={() => navigate('/dashboard')}
            style={{ border: 'none', cursor: 'pointer', textDecoration: 'none' }}
          >
            View Full Dashboard →
          </button>
        </div>
      )}

      <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
        <strong>Privacy:</strong> All CGM data is processed locally in your browser and stored in localStorage.
        The proxy server (server.js) only handles the OAuth token exchange — no glucose data passes through it.
        FreeStyle Libre and Dexcom are trademarks of Abbott and Dexcom Inc. Aster is not affiliated with either company.
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
