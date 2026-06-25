import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

export default function GlucoseChart({ chartData }) {
  const { labels, data } = chartData

  const dataset = {
    label: 'Glucose (mg/dL)',
    data,
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37,99,235,0.07)',
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    fill: true,
    tension: 0.3,
  }

  // Annotation-like: color points by zone
  const pointColors = data.map(v =>
    v < 70 ? '#EF4444' : v > 180 ? '#F97316' : '#10B981'
  )

  const chartDataObj = {
    labels,
    datasets: [dataset],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.raw} mg/dL`,
          afterLabel: ctx => {
            const v = ctx.raw
            if (v < 70) return ' ⚠ Low'
            if (v > 180) return ' ⚠ High'
            return ' ✓ In range'
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxTicksLimit: 8,
          font: { size: 10 },
          color: '#94A3B8',
        },
      },
      y: {
        min: 50,
        max: 280,
        grid: { color: '#F1F5F9' },
        ticks: {
          font: { size: 10 },
          color: '#94A3B8',
          callback: v => v + ' mg/dL',
        },
      },
    },
  }

  return <Line data={chartDataObj} options={options} />
}
