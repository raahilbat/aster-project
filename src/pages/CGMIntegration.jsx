import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GlucoseChart from '../components/GlucoseChart'
import TIRChart from '../components/TIRChart'
import { parseLibreCSV, calculateCGMMetrics, readingsToChartData, generateDemoReadings } from '../utils/cgmParser'
import { calculateT2DRisk } from '../utils/riskEngine'

export default function CGMIntegration() {
  const [selected, setSelected] = useState(null)
  const [readings, setReadings] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()
  const navigate = useNavigate()

  const processReadings = (data) => {
    const m = calculateCGMMetrics(data)
    const cd = readingsToChartData(data, 24)
    setReadings(data)
    setMetrics(m)
    setChartData(cd)
    localStorage.setItem('asterCGMData', JSON.stringify(data))
  }

  const handleLibreFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseLibreCSV(ev.target.result)
        if (parsed.length === 0) {
          setError('No valid glucose readings found in this file. Make sure it\'s a LibreView CSV export.')
          return
        }
        processReadings(parsed)
      } catch (err) {
        setError('Failed to parse file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const handleDemo = () => {
    const formData = localStorage.getItem('asterFormData')
    let riskLevel = 'Moderate'
    if (formData) {
      const t2d = calculateT2DRisk(JSON.parse(formData))
      riskLevel = t2d.riskLevel
    }
    const demo = generateDemoReadings(riskLevel)
    processReadings(demo)
  }

  const handleDexcomDemo = () => {
    // Simulate Dexcom API response structure
    const demoReadings = generateDemoReadings('Moderate')
    processReadings(demoReadings)
  }

  return (
    <div className="cgm-page">
      <h1>CGM Integration</h1>
      <p>
        Connect your continuous glucose monitor to see glucose trends, time-in-range, and an estimated HbA1c on your dashboard.
      </p>

      <div className="cgm-options">
        <div
          className={`cgm-card ${selected === 'libre' ? 'selected' : ''}`}
          onClick={() => { setSelected('libre'); setReadings(null) }}
        >
          <div className="cgm-card-logo">💙</div>
          <h3>FreeStyle Libre</h3>
          <p>Abbott Libre 2 or Libre 3. Upload a CSV export from LibreView.com</p>
        </div>
        <div
          className={`cgm-card ${selected === 'dexcom' ? 'selected' : ''}`}
          onClick={() => { setSelected('dexcom'); setReadings(null) }}
        >
          <div className="cgm-card-logo">🟢</div>
          <h3>Dexcom G6 / G7</h3>
          <p>Connect via the Dexcom API using OAuth2. Or use demo data to explore.</p>
        </div>
        <div
          className={`cgm-card ${selected === 'nightscout' ? 'selected' : ''}`}
          onClick={() => { setSelected('nightscout'); setReadings(null) }}
        >
          <div className="cgm-card-logo">🌙</div>
          <h3>Nightscout</h3>
          <p>Self-hosted CGM data aggregator. Works with Libre, Dexcom, Medtronic &amp; more.</p>
        </div>
        <div
          className={`cgm-card ${selected === 'demo' ? 'selected' : ''}`}
          onClick={() => setSelected('demo')}
        >
          <div className="cgm-card-logo">🎭</div>
          <h3>Demo Data</h3>
          <p>Load realistic 14-day simulated CGM data to explore the dashboard features.</p>
        </div>
      </div>

      {/* Libre action area */}
      {selected === 'libre' && (
        <div className="cgm-action-area">
          <h3>Upload FreeStyle Libre CSV</h3>
          <p>
            In <strong>LibreView.com</strong> → go to your account → Reports → Export Raw Data → Download CSV.
            Then upload that file here. All data stays on your device.
          </p>
          <div className="file-upload-zone" onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleLibreFile} />
            <div className="upload-icon">📂</div>
            <div className="upload-text">Click to upload LibreView CSV file</div>
            <div className="upload-hint">Supported: LibreView export CSV (Historic Glucose)</div>
          </div>
          {error && (
            <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--danger-light)', borderRadius: 'var(--radius)', color: '#991B1B', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>No CSV yet? Try demo data instead:</div>
            <button className="btn-demo" onClick={handleDemo}>Load Demo Data</button>
          </div>
        </div>
      )}

      {/* Dexcom action area */}
      {selected === 'dexcom' && (
        <div className="cgm-action-area">
          <h3>Connect Dexcom API</h3>
          <p>
            Dexcom has a public OAuth2 API at <strong>developer.dexcom.com</strong>. A full integration requires
            a backend to securely exchange OAuth tokens — below are the steps, plus a demo to explore the UI now.
          </p>
          <div className="dexcom-steps">
            <div className="dexcom-step">
              <div className="dexcom-step-num">1</div>
              <div className="dexcom-step-text">Register at <strong>developer.dexcom.com</strong> and create an app to get a Client ID.</div>
            </div>
            <div className="dexcom-step">
              <div className="dexcom-step-num">2</div>
              <div className="dexcom-step-text">Add a backend (Node/Python) to handle the OAuth2 token exchange. Dexcom sandbox is available for testing without a real device.</div>
            </div>
            <div className="dexcom-step">
              <div className="dexcom-step-num">3</div>
              <div className="dexcom-step-text">Call <strong>GET /v3/users/self/egvs</strong> with a date range to retrieve EGV (estimated glucose values) every 5 minutes.</div>
            </div>
            <div className="dexcom-step">
              <div className="dexcom-step-num">4</div>
              <div className="dexcom-step-text">Pass the JSON response to <strong>parseDexcomData()</strong> in <code>src/utils/cgmParser.js</code> — it returns the same normalised format used for Libre data.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn-dexcom" onClick={handleDexcomDemo}>
              Load Dexcom Demo Data
            </button>
          </div>
        </div>
      )}

      {/* Nightscout area */}
      {selected === 'nightscout' && (
        <div className="cgm-action-area">
          <h3>Connect Nightscout</h3>
          <p>
            Nightscout is an open-source CGM remote monitoring platform. Many T1D patients self-host it.
            If you have a Nightscout instance, enter its URL below to pull your entries.
          </p>
          <div className="dexcom-steps">
            <div className="dexcom-step">
              <div className="dexcom-step-num">1</div>
              <div className="dexcom-step-text">Enter your Nightscout URL (e.g. <strong>https://yoursite.herokuapp.com</strong>)</div>
            </div>
            <div className="dexcom-step">
              <div className="dexcom-step-num">2</div>
              <div className="dexcom-step-text">Aster fetches <strong>/api/v1/entries.json?count=288</strong> — that's the last 24 hours of readings.</div>
            </div>
            <div className="dexcom-step">
              <div className="dexcom-step-num">3</div>
              <div className="dexcom-step-text">Nightscout supports Dexcom, FreeStyle Libre (via xDrip+), Medtronic, and most CGM devices.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
            <input className="field-input" type="url" placeholder="https://your-nightscout-url.com" style={{ maxWidth: 360 }} />
            <button className="btn-next" style={{ padding: '12px 20px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Connect</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn-demo" onClick={handleDemo}>Load Demo Data Instead</button>
          </div>
        </div>
      )}

      {/* Demo */}
      {selected === 'demo' && !readings && (
        <div className="cgm-action-area">
          <h3>Demo CGM Data</h3>
          <p>Load a 14-day simulated glucose trace calibrated to your risk profile. Explore all dashboard features without a real CGM device.</p>
          <button className="btn-demo" onClick={handleDemo}>Generate 14-Day Demo Trace</button>
        </div>
      )}

      {/* Results preview */}
      {readings && metrics && chartData && (
        <div style={{ marginTop: 0 }}>
          <div className="cgm-result-preview" style={{ marginBottom: 24 }}>
            <h4>✓ {readings[0]?.source === 'demo' ? 'Demo data loaded' : 'CGM data loaded'} — {metrics.readingCount} readings over {metrics.daysOfData} day{metrics.daysOfData > 1 ? 's' : ''}</h4>
            <div className="cgm-stats-mini">
              <div className="cgm-stat-mini">
                <div className="cgm-stat-val">{metrics.avgMgdl} <span style={{fontSize:'0.7rem',fontWeight:400}}>mg/dL</span></div>
                <div className="cgm-stat-lbl">Average glucose</div>
              </div>
              <div className="cgm-stat-mini">
                <div className="cgm-stat-val" style={{color: metrics.tir.inRange >= 70 ? 'var(--success)' : 'var(--warning)'}}>{metrics.tir.inRange}%</div>
                <div className="cgm-stat-lbl">Time in range</div>
              </div>
              <div className="cgm-stat-mini">
                <div className="cgm-stat-val" style={{color: metrics.gmi >= 6.5 ? 'var(--danger)' : metrics.gmi >= 5.7 ? 'var(--warning)' : 'var(--success)'}}>{metrics.gmi}%</div>
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

          <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ border: 'none', cursor: 'pointer', textDecoration: 'none' }}>
            View Full Dashboard →
          </button>
        </div>
      )}

      <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
        <strong>Privacy:</strong> All CGM data is processed locally in your browser and stored in localStorage on your device.
        No glucose data is sent to any external server. FreeStyle Libre and Dexcom are trademarks of their respective owners.
        Aster is not affiliated with Abbott or Dexcom.
      </div>
    </div>
  )
}
