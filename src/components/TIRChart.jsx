import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

export default function TIRChart({ tir }) {
  const data = {
    labels: ['In Range (70–180)', 'Low (<70)', 'High (>180)'],
    datasets: [{
      data: [tir.inRange, tir.low, tir.high],
      backgroundColor: ['#10B981', '#EF4444', '#F97316'],
      borderWidth: 2,
      borderColor: '#FFFFFF',
    }],
  }

  const options = {
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.raw}% of time`,
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ width: 160, height: 160, flexShrink: 0 }}>
        <Doughnut data={data} options={options} />
      </div>
      <div className="tir-legend">
        <div className="tir-legend-item">
          <div className="tir-dot" style={{ background: '#10B981' }} />
          <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>In Range (70–180 mg/dL)</span>
          <strong style={{ fontSize: '0.9rem' }}>{tir.inRange}%</strong>
        </div>
        <div className="tir-legend-item">
          <div className="tir-dot" style={{ background: '#F97316' }} />
          <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>High (&gt;180 mg/dL)</span>
          <strong style={{ fontSize: '0.9rem' }}>{tir.high}%</strong>
        </div>
        <div className="tir-legend-item">
          <div className="tir-dot" style={{ background: '#EF4444' }} />
          <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Low (&lt;70 mg/dL)</span>
          <strong style={{ fontSize: '0.9rem' }}>{tir.low}%</strong>
        </div>
        <div style={{ marginTop: 12, padding: '8px 12px', background: tir.inRange >= 70 ? 'var(--success-light)' : 'var(--warning-light)', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, color: tir.inRange >= 70 ? '#065F46' : '#92400E' }}>
          ADA target: ≥70% in range {tir.inRange >= 70 ? '✓ Met' : '— not met yet'}
        </div>
      </div>
    </div>
  )
}
