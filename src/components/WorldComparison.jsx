import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js'
import {
  IDF_GLOBAL, IDF_REGIONS, GLOBAL_BY_AGE, GLUCOSE_STATUS, buildWorldComparison,
} from '../utils/idfData'

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

// ── Age prevalence chart ───────────────────────────────────
function AgeChart({ userAge }) {
  const age = parseInt(userAge || 40)
  const colors = GLOBAL_BY_AGE.map(g => {
    const [lo, hi] = g.group.split('–').map(Number)
    return age >= lo && age <= hi ? '#2563EB' : '#BFDBFE'
  })

  const data = {
    labels: GLOBAL_BY_AGE.map(g => g.group),
    datasets: [{
      label: 'Diabetes prevalence (%)',
      data: GLOBAL_BY_AGE.map(g => g.prevalence),
      backgroundColor: colors,
      borderRadius: 4,
      borderSkipped: false,
    }],
  }

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw}% have diabetes globally` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#64748B' } },
      y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 }, color: '#64748B', callback: v => v + '%' }, max: 30 },
    },
  }

  return <Bar data={data} options={options} />
}

// ── Regional chart ─────────────────────────────────────────
function RegionChart() {
  const sorted = [...IDF_REGIONS].sort((a, b) => b.prevalence - a.prevalence)
  const data = {
    labels: sorted.map(r => r.region),
    datasets: [{
      label: 'Prevalence (%)',
      data: sorted.map(r => r.prevalence),
      backgroundColor: ['#EF4444','#F97316','#F59E0B','#10B981','#2563EB','#8B5CF6','#64748B'],
      borderRadius: 4, borderSkipped: false,
    }],
  }
  const options = {
    indexAxis: 'y',
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw}% age-adjusted prevalence` } },
    },
    scales: {
      x: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 }, callback: v => v + '%' } },
      y: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#475569' } },
    },
  }
  return <Bar data={data} options={options} />
}

// ── Glucose status donut ───────────────────────────────────
function GlucoseStatusChart() {
  const data = {
    labels: GLUCOSE_STATUS.map(g => `${g.label} (${g.pct}%)`),
    datasets: [{
      data: GLUCOSE_STATUS.map(g => g.pct),
      backgroundColor: GLUCOSE_STATUS.map(g => g.color),
      borderWidth: 2, borderColor: '#fff',
    }],
  }
  const options = {
    cutout: '60%', responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw}% of global adults` } },
    },
  }
  return <Doughnut data={data} options={options} />
}

// ── Percentile bar ─────────────────────────────────────────
function PercentileBar({ percentile, riskLevel }) {
  const color = percentile >= 75 ? '#EF4444' : percentile >= 50 ? '#F59E0B' : '#10B981'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
        <span>Lower risk</span>
        <span>Higher risk</span>
      </div>
      <div style={{ height: 14, background: 'linear-gradient(90deg, #10B981, #F59E0B, #EF4444)', borderRadius: 100, position: 'relative', marginBottom: 8 }}>
        <div style={{
          position: 'absolute', top: '50%', left: `${percentile}%`,
          transform: 'translate(-50%, -50%)',
          width: 22, height: 22, background: 'white',
          border: `3px solid ${color}`, borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        You are in the <strong style={{ color }}>{percentile}th percentile</strong> — higher risk than {percentile}% of the global adult population
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────
export default function WorldComparison({ answers, t2dRisk }) {
  if (!answers || !t2dRisk) return null

  const wc = buildWorldComparison(answers, t2dRisk)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Global headline stats */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Global Diabetes Snapshot</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>IDF Diabetes Atlas — 10th Edition, 2021</p>
          </div>
          <a href="https://diabetesatlas.org" target="_blank" rel="noreferrer"
            style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--primary)', borderRadius: 100 }}>
            View Source ↗
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <StatTile value="537M"   label="Adults with diabetes"      sub="worldwide in 2021"       color="var(--danger)" />
          <StatTile value="10.5%"  label="Global prevalence"         sub="of adults aged 20–79"    color="var(--primary)" />
          <StatTile value="240M"   label="Undiagnosed"               sub="1 in 2 don't know"       color="var(--orange)" />
          <StatTile value="541M"   label="Prediabetes"               sub="at risk globally"        color="var(--warning)" />
          <StatTile value="783M"   label="Projected by 2045"         sub="+46% from today"         color="var(--purple)" />
          <StatTile value="6.7M"   label="Deaths in 2021"            sub="attributed to diabetes"  color="#64748B" />
        </div>
      </div>

      {/* User's personal percentile */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Your Global Risk Ranking</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
          Based on your age, BMI, and risk factors compared against global IDF population data
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          <StatTile
            value={`${wc.ageGroupPrevalence}%`}
            label="Diabetes prevalence in your age group"
            sub="global IDF data"
            color="var(--primary)"
          />
          <StatTile
            value={`${wc.userRiskPct}%`}
            label="Your estimated 10-year risk"
            sub="from questionnaire"
            color={wc.userRiskPct > 17 ? 'var(--danger)' : wc.userRiskPct > 4 ? 'var(--warning)' : 'var(--success)'}
          />
          <StatTile
            value={`${wc.bmiMultiplier}×`}
            label="Your BMI risk multiplier"
            sub="vs world average BMI"
            color={wc.bmiMultiplier > 2 ? 'var(--danger)' : wc.bmiMultiplier > 1 ? 'var(--warning)' : 'var(--success)'}
          />
        </div>

        <PercentileBar percentile={wc.riskPercentile} riskLevel={t2dRisk.riskLevel} />

        <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-primary)' }}>What this means: </strong>
          Approximately <strong>{wc.ageGroupPrevalence}%</strong> of adults your age worldwide currently have diabetes.
          Your personal risk score puts you at a <strong>{wc.userRiskPct}% 10-year probability</strong> —
          {wc.userRiskPct > wc.ageGroupPrevalence
            ? ` higher than the global average for your age group.`
            : ` within the expected range for your age group.`}
          {' '}If global trends continue, <strong>783 million</strong> adults will have diabetes by 2045.
        </div>
      </div>

      {/* Age group chart */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Diabetes by Age Group — Worldwide</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Blue bar = your age group. Global prevalence % by 5-year band. Source: IDF Atlas 2021
        </p>
        <div style={{ height: 220 }}>
          <AgeChart userAge={answers.age} />
        </div>
      </div>

      {/* Two column: Regional + Glucose status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>By World Region</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>Age-adjusted comparative prevalence %</p>
          <div style={{ height: 220 }}>
            <RegionChart />
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, boxShadow: 'var(--shadow)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Global Glucose Status</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>Breakdown of all adults aged 20–79</p>
          <div style={{ height: 200 }}>
            <GlucoseStatusChart />
          </div>
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
            { icon: '📈', text: 'Diabetes cases have tripled since 2000 and are projected to reach 783M by 2045' },
            { icon: '👶', text: '1.2 million children and adolescents under 20 are living with Type 1 diabetes' },
            { icon: '💊', text: '$966 billion spent globally on diabetes healthcare — 9–12% of all adult health spending' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{f.icon}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Source: International Diabetes Federation Diabetes Atlas, 10th Edition (2021) — diabetesatlas.org
        </div>
      </div>
    </div>
  )
}
