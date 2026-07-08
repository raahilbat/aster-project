import { useState, useEffect } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js'
import { IDF_GLOBAL, GLOBAL_BY_AGE, GLUCOSE_STATUS, buildWorldComparison } from '../utils/idfData'
import { fetchWHOData, findCountry, getCountryRank, COUNTRY_LIST } from '../utils/whoApi'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

// ── Stat tile ─────────────────────────────────────────────
function StatTile({ value, label, sub, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.04em', color: color || 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── WHO regional bar chart (live data) ────────────────────
function RegionChart({ regions }) {
  const sorted = [...regions].sort((a, b) => b.avg - a.avg)
  const data = {
    labels: sorted.map(r => r.region),
    datasets: [{
      label: 'Avg prevalence (%)',
      data:  sorted.map(r => r.avg),
      backgroundColor: ['#EF4444','#F97316','#F59E0B','#10B981','#2563EB','#8B5CF6'],
      borderRadius: 4, borderSkipped: false,
    }],
  }
  const options = {
    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw}% average prevalence` } },
    },
    scales: {
      x: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 }, callback: v => v + '%' } },
      y: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#475569' } },
    },
  }
  return <Bar data={data} options={options} />
}

// ── Top / Bottom countries chart ──────────────────────────
function CountriesChart({ countries, selectedCode }) {
  const top10    = countries.slice(0, 10)
  const bottom10 = [...countries].reverse().slice(0, 10).reverse()
  const combined = [...top10, ...bottom10]

  const colors = combined.map(c =>
    c.code === selectedCode ? '#2563EB' : combined.indexOf(c) < 10 ? '#FECACA' : '#D1FAE5'
  )

  const data = {
    labels: combined.map(c => c.code),
    datasets: [{
      label: 'Prevalence (%)',
      data:  combined.map(c => c.prevalence),
      backgroundColor: colors,
      borderRadius: 4, borderSkipped: false,
    }],
  }
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: ctx => {
            const c = combined[ctx[0].dataIndex]
            const name = COUNTRY_LIST.find(cl => cl.code === c.code)?.name || c.code
            return name
          },
          label: ctx => ` ${ctx.raw}% age-standardized prevalence`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#64748B' } },
      y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 9 }, callback: v => v + '%' }, max: 45 },
    },
  }
  return <Bar data={data} options={options} />
}

// ── Age group chart (IDF data) ────────────────────────────
function AgeChart({ userAge }) {
  const age = parseInt(userAge || 40)
  const colors = GLOBAL_BY_AGE.map(g => {
    const [lo, hi] = g.group.split('–').map(Number)
    return age >= lo && age <= hi ? '#2563EB' : '#BFDBFE'
  })
  const data = {
    labels: GLOBAL_BY_AGE.map(g => g.group),
    datasets: [{ label: 'Prevalence (%)', data: GLOBAL_BY_AGE.map(g => g.prevalence), backgroundColor: colors, borderRadius: 4, borderSkipped: false }],
  }
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw}% globally` } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#64748B' } },
      y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 }, callback: v => v + '%' }, max: 30 },
    },
  }
  return <Bar data={data} options={options} />
}

// ── Glucose status donut (IDF) ────────────────────────────
function GlucoseStatusChart() {
  const data = {
    labels: GLUCOSE_STATUS.map(g => `${g.label} (${g.pct}%)`),
    datasets: [{ data: GLUCOSE_STATUS.map(g => g.pct), backgroundColor: GLUCOSE_STATUS.map(g => g.color), borderWidth: 2, borderColor: '#fff' }],
  }
  return (
    <Doughnut data={data} options={{
      cutout: '60%', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw}% of global adults` } },
      },
    }} />
  )
}

// ── Percentile bar ────────────────────────────────────────
function PercentileBar({ percentile }) {
  const color = percentile >= 75 ? '#EF4444' : percentile >= 50 ? '#F59E0B' : '#10B981'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
        <span>Lower risk than most</span><span>Higher risk than most</span>
      </div>
      <div style={{ height: 14, background: 'linear-gradient(90deg,#10B981,#F59E0B,#EF4444)', borderRadius: 100, position: 'relative', marginBottom: 10 }}>
        <div style={{ position: 'absolute', top: '50%', left: `${percentile}%`, transform: 'translate(-50%,-50%)', width: 22, height: 22, background: 'white', border: `3px solid ${color}`, borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        You are in the <strong style={{ color }}>{percentile}th percentile</strong> — your risk is higher than {percentile}% of the global adult population
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────
export default function WorldComparison({ answers, t2dRisk }) {
  const [whoData,      setWhoData]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [selectedCode, setSelectedCode] = useState('USA')

  useEffect(() => {
    fetchWHOData()
      .then(d => { setWhoData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (!answers || !t2dRisk) return null

  const wc              = buildWorldComparison(answers, t2dRisk)
  const selectedCountry = whoData ? findCountry(whoData, selectedCode) : null
  const countryRank     = whoData ? getCountryRank(whoData, selectedCode) : null
  const totalCountries  = whoData?.countries?.length || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Global headline stats — IDF 2021 */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Global Diabetes Snapshot</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>IDF Diabetes Atlas 10th Edition (2021) · WHO GHO prevalence data (2022)</p>
          </div>
          <a href="https://diabetesatlas.org" target="_blank" rel="noreferrer"
            style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--primary)', borderRadius: 100 }}>
            IDF Source ↗
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <StatTile value="830M"  label="Adults with diabetes"    sub="WHO estimate 2022"      color="var(--danger)" />
          <StatTile value="14%"   label="Global prevalence"       sub="of adults 18+, 2022"    color="var(--primary)" />
          <StatTile value="240M"  label="Undiagnosed"             sub="1 in 2 don't know"      color="var(--orange)" />
          <StatTile value="541M"  label="Prediabetes"             sub="at risk globally"       color="var(--warning)" />
          <StatTile value="783M"  label="Projected by 2045"       sub="IDF projection"         color="var(--purple)" />
          <StatTile value="6.7M"  label="Deaths (2021)"           sub="attributed to diabetes" color="#64748B" />
        </div>
      </div>

      {/* User's personal ranking */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Your Global Risk Position</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
          Based on your questionnaire answers compared against WHO 2022 data from {totalCountries} countries
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatTile value={`${wc.ageGroupPrevalence}%`} label="Diabetes in your age group" sub="global IDF data"
            color="var(--primary)" />
          <StatTile value={`${wc.userRiskPct}%`} label="Your 10-year risk estimate" sub="from questionnaire"
            color={wc.userRiskPct > 17 ? 'var(--danger)' : wc.userRiskPct > 4 ? 'var(--warning)' : 'var(--success)'} />
          <StatTile value={`${wc.bmiMultiplier}×`} label="Your BMI risk multiplier" sub="vs world average"
            color={wc.bmiMultiplier > 2 ? 'var(--danger)' : wc.bmiMultiplier > 1 ? 'var(--warning)' : 'var(--success)'} />
        </div>
        <PercentileBar percentile={wc.riskPercentile} />
        <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-primary)' }}>In context: </strong>
          Around <strong>{wc.ageGroupPrevalence}%</strong> of adults your age have diabetes globally.
          Your personal 10-year risk is <strong>{wc.userRiskPct}%</strong> —
          {wc.userRiskPct > wc.ageGroupPrevalence ? ' above the global average for your age.' : ' within the expected range for your age.'}
          {' '}WHO estimates <strong>830 million adults</strong> now live with diabetes worldwide.
        </div>
      </div>

      {/* Country comparison — live WHO data */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Country Comparison</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              WHO GHO · Age-standardized diabetes prevalence · {whoData ? `${totalCountries} countries · 2022` : 'Loading…'}
            </p>
          </div>
          <select
            value={selectedCode}
            onChange={e => setSelectedCode(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontFamily: 'inherit', cursor: 'pointer', maxWidth: 200 }}
          >
            {COUNTRY_LIST.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <div style={{ marginBottom: 8 }}>⏳ Fetching live WHO data…</div>
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: 'var(--danger-light)', borderRadius: 'var(--radius)', fontSize: '0.85rem', color: '#991B1B', margin: '16px 0' }}>
            Could not load WHO data: {error}
          </div>
        )}

        {whoData && selectedCountry && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140, padding: '14px 16px', background: 'var(--primary-light)', borderRadius: 'var(--radius)', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {COUNTRY_LIST.find(c => c.code === selectedCode)?.name} Prevalence
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.04em' }}>{selectedCountry.prevalence}%</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>age-standardized, 2022</div>
            </div>
            <div style={{ flex: 1, minWidth: 140, padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Global Rank</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.04em' }}>#{countryRank}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>of {totalCountries} countries (1 = highest)</div>
            </div>
            <div style={{ flex: 1, minWidth: 140, padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Region</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: 4 }}>{selectedCountry.region}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>WHO region classification</div>
            </div>
          </div>
        )}

        {whoData && (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Red = top 10 highest · Green = bottom 10 lowest · Blue = selected country
            </p>
            <div style={{ height: 220 }}>
              <CountriesChart countries={whoData.countries} selectedCode={selectedCode} />
            </div>
          </>
        )}
      </div>

      {/* Regional averages — live WHO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>By WHO Region</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            {whoData ? 'Live WHO GHO data — average across countries in each region' : 'Loading…'}
          </p>
          <div style={{ height: 220 }}>
            {whoData
              ? <RegionChart regions={whoData.regions} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading WHO data…</div>
            }
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Global Glucose Status</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>Breakdown of all adults aged 20–79 · IDF Atlas</p>
          <div style={{ height: 200 }}>
            <GlucoseStatusChart />
          </div>
        </div>
      </div>

      {/* Age group chart */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Diabetes by Age Group — Worldwide</h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Blue = your age group · Source: IDF Atlas
        </p>
        <div style={{ height: 220 }}>
          <AgeChart userAge={answers.age} />
        </div>
      </div>

      {/* Key facts */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Key Global Facts</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {[
            { icon: '🌍', text: '3 in 4 adults with diabetes live in low or middle-income countries' },
            { icon: '👤', text: '1 in 2 people with diabetes is undiagnosed — 240 million people don\'t know' },
            { icon: '⚡', text: 'Diabetes caused 6.7 million deaths in 2021 — 1 death every 5 seconds' },
            { icon: '📈', text: 'Cases doubled from 200M (1990) to 830M (2022) and are rising fastest in developing nations' },
            { icon: '👶', text: '1.2 million children and adolescents under 20 are living with Type 1 diabetes' },
            { icon: '💊', text: 'Over 59% of adults 30+ with diabetes are not on medication (WHO 2022)' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{f.icon}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Sources: WHO Global Health Observatory 2022 · IDF Diabetes Atlas 10th Edition (2021) · WHO Fact Sheet on Diabetes 2024
        </div>
      </div>
    </div>
  )
}
