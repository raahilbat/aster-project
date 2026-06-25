import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement } from 'chart.js'

ChartJS.register(ArcElement)

const COLORS = {
  low: '#10B981',
  slightly: '#FBBF24',
  moderate: '#F59E0B',
  high: '#F97316',
  'very-high': '#EF4444',
}

export default function RiskGauge({ percent, riskBadgeClass }) {
  const color = COLORS[riskBadgeClass] || '#94A3B8'
  const remaining = 100 - percent

  const data = {
    datasets: [{
      data: [percent, remaining],
      backgroundColor: [color, '#F1F5F9'],
      borderWidth: 0,
      circumference: 180,
      rotation: -90,
    }],
  }

  const options = {
    cutout: '72%',
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    animation: { duration: 800, easing: 'easeOutQuart' },
    responsive: true,
    maintainAspectRatio: false,
  }

  return (
    <div className="risk-gauge-wrap">
      <Doughnut data={data} options={options} />
      <div className="risk-score-label">
        <div className="risk-score-value" style={{ color }}>
          {percent}<span style={{ fontSize: '1rem' }}>%</span>
        </div>
        <div className="risk-score-sub">risk score</div>
      </div>
    </div>
  )
}
