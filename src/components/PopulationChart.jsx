import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function PopulationChart({ comparisonData }) {
  const { ageGroups, myAgeGroup } = comparisonData

  const backgroundColors = ageGroups.map(g =>
    g.label === myAgeGroup.label ? '#2563EB' : '#BFDBFE'
  )

  const data = {
    labels: ageGroups.map(g => g.label),
    datasets: [
      {
        label: 'Diabetes prevalence (%)',
        data: ageGroups.map(g => g.prevalence),
        backgroundColor: backgroundColors,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.raw}% of this age group has diabetes`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#64748B' },
      },
      y: {
        grid: { color: '#F1F5F9' },
        ticks: {
          font: { size: 11 },
          color: '#64748B',
          callback: v => v + '%',
        },
        max: 35,
      },
    },
  }

  return <Bar data={data} options={options} />
}
