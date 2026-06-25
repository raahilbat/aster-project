import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlucoseChart from '../components/GlucoseChart'
import TIRChart from '../components/TIRChart'
import PopulationChart from '../components/PopulationChart'
import { calculateT2DRisk, compareToPopulation } from '../utils/riskEngine'
import { calculateCGMMetrics, readingsToChartData, generateDemoReadings } from '../utils/cgmParser'

export default function Dashboard() {
  const [riskData, setRiskData] = useState(null)
  const [cgmData, setCgmData] = useState(null)
  const [labData, setLabData] = useState(null)

  useEffect(() => {
    const form = localStorage.getItem('asterFormData')
    if (form) {
      const answers = JSON.parse(form)
      const t2d = calculateT2DRisk(answers)
      const pop = compareToPopulation(answers.age, t2d.bmi, t2d.rawScore)
      setRiskData({ answers, t2d, pop })
    }

    const cgm = localStorage.getItem('asterCGMData')
    if (cgm) {
      const readings = JSON.parse(cgm).map(r => ({ ...r, timestamp: new Date(r.timestamp) }))
      const metrics = calculateCGMMetrics(readings)
      const chartData = readingsToChartData(readings, 24)
      setCgmData({ readings, metrics, chartData })
    }

    const lab = localStorage.getItem('asterLabData')
    if (lab) setLabData(JSON.parse(lab))
  }, [])

  const hasNoData = !riskData && !cgmData && !labData

  return (
    <div className="dashboard-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
            Health Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {riskData?.answers.name ? `Welcome back, ${riskData.answers.name}` : 'Your health overview at a glance'}
          </p>
        </div>
        <Link to="/questionnaire" className="btn-primary">Re-take Assessment</Link>
      </div>

      {hasNoData && (
        <div className="no-data-state">
          <div className="no-data-icon">📊</div>
          <div className="no-data-title">No data yet</div>
          <div className="no-data-desc">Complete the health assessment to populate your dashboard.</div>
          <Link to="/questionnaire" className="btn-primary">Start Assessment →</Link>
        </div>
      )}

      {/* Stat tiles */}
      {riskData && (
        <div className="stat-row">
          <div className="stat-tile">
            <div className="stat-tile-label">T2D Risk Score</div>
            <div className="stat-tile-value" style={{ color: riskData.t2d.riskBadgeClass === 'low' ? 'var(--success)' : riskData.t2d.riskBadgeClass === 'high' || riskData.t2d.riskBadgeClass === 'very-high' ? 'var(--danger)' : 'var(--warning)' }}>
              {riskData.t2d.percent}%
            </div>
            <div className="stat-tile-sub">{riskData.t2d.riskLevel} risk</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-label">BMI</div>
            <div className="stat-tile-value">{riskData.t2d.bmi ? riskData.t2d.bmi.toFixed(1) : '—'}</div>
            <div className="stat-tile-sub">{riskData.t2d.bmiCategory}</div>
          </div>
          {cgmData && (
            <>
              <div className="stat-tile">
                <div className="stat-tile-label">Avg Glucose</div>
                <div className="stat-tile-value">{cgmData.metrics.avgMgdl}</div>
                <div className="stat-tile-sub">mg/dL ({cgmData.metrics.avgMmol} mmol/L)</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile-label">Est. HbA1c (GMI)</div>
                <div className="stat-tile-value" style={{ color: cgmData.metrics.gmi >= 6.5 ? 'var(--danger)' : cgmData.metrics.gmi >= 5.7 ? 'var(--warning)' : 'var(--success)' }}>
                  {cgmData.metrics.gmi}%
                </div>
                <div className="stat-tile-sub">Glucose Mgmt Indicator</div>
              </div>
            </>
          )}
          {!cgmData && labData?.hba1c && (
            <div className="stat-tile">
              <div className="stat-tile-label">HbA1c</div>
              <div className="stat-tile-value" style={{ color: labData.hba1c >= 6.5 ? 'var(--danger)' : labData.hba1c >= 5.7 ? 'var(--warning)' : 'var(--success)' }}>
                {labData.hba1c}%
              </div>
              <div className="stat-tile-sub">{labData.hba1c < 5.7 ? 'Normal' : labData.hba1c < 6.5 ? 'Prediabetes' : 'Diabetic range'}</div>
            </div>
          )}
          {!cgmData && !labData?.hba1c && (
            <div className="stat-tile" style={{ cursor: 'pointer', borderStyle: 'dashed' }}>
              <Link to="/cgm" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="stat-tile-label">Avg Glucose</div>
                <div className="stat-tile-value" style={{ color: 'var(--text-muted)' }}>—</div>
                <div className="stat-tile-sub" style={{ color: 'var(--primary)' }}>+ Connect CGM</div>
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-grid">
        {/* Glucose chart */}
        {cgmData && (
          <div className="section-card full-width">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0 }}>Glucose — Last 24 Hours</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {cgmData.metrics.readingCount} readings • {cgmData.metrics.daysOfData} day{cgmData.metrics.daysOfData > 1 ? 's' : ''} of data
              </span>
            </div>
            <div className="chart-wrap" style={{ height: 240 }}>
              <GlucoseChart chartData={cgmData.chartData} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                { color: '#10B981', label: 'In range (70–180 mg/dL)' },
                { color: '#F97316', label: 'High (>180 mg/dL)' },
                { color: '#EF4444', label: 'Low (<70 mg/dL)' },
              ].map(b => (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: b.color }} />
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TIR */}
        {cgmData && (
          <div className="section-card">
            <h2>Time in Range</h2>
            <TIRChart tir={cgmData.metrics.tir} />
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>Std Deviation</div>
                <div style={{ fontWeight: 700 }}>{cgmData.metrics.sd} mg/dL</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>CV% (variability)</div>
                <div style={{ fontWeight: 700, color: cgmData.metrics.cv > 36 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {cgmData.metrics.cv}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Population comparison */}
        {riskData && (
          <div className="section-card" style={cgmData ? {} : { gridColumn: '1 / -1' }}>
            <h2>Population Comparison</h2>
            <div style={{ height: 200 }}>
              <PopulationChart comparisonData={riskData.pop} />
            </div>
            <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Blue = your age group. CDC NHANES 2017–2020 data.
            </div>
          </div>
        )}

        {/* Lab values */}
        {labData && (
          <div className="section-card">
            <h2>Lab Results</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'hba1c', label: 'HbA1c', unit: '%', normal: v => v < 5.7, border: v => v >= 5.7 && v < 6.5 },
                { key: 'fastingGlucose', label: 'Fasting Glucose', unit: 'mg/dL', normal: v => v < 100, border: v => v >= 100 && v < 126 },
                { key: 'totalCholesterol', label: 'Total Cholesterol', unit: 'mg/dL', normal: v => v < 200, border: v => v >= 200 && v < 240 },
                { key: 'bloodPressure', label: 'Blood Pressure (sys.)', unit: 'mmHg', normal: v => v < 120, border: v => v >= 120 && v < 130 },
              ].filter(f => labData[f.key]).map(f => {
                const v = parseFloat(labData[f.key])
                const isNormal = f.normal(v)
                const isBorder = !isNormal && f.border(v)
                const color = isNormal ? 'var(--success)' : isBorder ? 'var(--warning)' : 'var(--danger)'
                return (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{f.label}</div>
                    <div style={{ fontWeight: 700, color, fontSize: '0.95rem' }}>{v} {f.unit}</div>
                  </div>
                )
              })}
              <Link to="/lab-reports" style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none', marginTop: 4 }}>
                Update lab results →
              </Link>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="section-card" style={{ gridColumn: '1 / -1' }}>
          <h2>Add More Data</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { to: '/cgm', icon: '📡', title: 'Connect CGM', desc: 'FreeStyle Libre CSV or Dexcom API', color: '#EFF6FF' },
              { to: '/lab-reports', icon: '🩺', title: 'Log Lab Results', desc: 'HbA1c, glucose, cholesterol, BP', color: '#ECFDF5' },
              { to: '/results', icon: '📊', title: 'View Full Results', desc: 'Detailed risk breakdown and recommendations', color: '#F5F3FF' },
            ].map(item => (
              <Link key={item.to} to={item.to} style={{ textDecoration: 'none', padding: 20, background: item.color, borderRadius: 'var(--radius)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.4rem' }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
