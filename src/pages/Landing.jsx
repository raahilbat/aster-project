import { Link } from 'react-router-dom'

const features = [
  {
    icon: '📋',
    color: '#EFF6FF',
    title: 'Risk Questionnaire',
    desc: 'Evidence-based FINDRISC questionnaire covering age, BMI, symptoms, lifestyle, and family history.',
  },
  {
    icon: '📊',
    color: '#ECFDF5',
    title: 'Risk Score & Charts',
    desc: 'Visual gauge charts showing your T2D and autoimmune risk with a clear probability estimate.',
  },
  {
    icon: '👥',
    color: '#F5F3FF',
    title: 'Population Comparison',
    desc: 'See where you stand against CDC NHANES data — real diabetes prevalence by age, BMI, and gender.',
  },
  {
    icon: '📡',
    color: '#FFFBEB',
    title: 'CGM Integration',
    desc: 'Upload FreeStyle Libre CSV exports or connect Dexcom to see glucose trends and time-in-range.',
  },
  {
    icon: '🩺',
    color: '#FEF2F2',
    title: 'Lab Reports',
    desc: 'Log your HbA1c, fasting glucose, cholesterol, and blood pressure for ongoing tracking.',
  },
  {
    icon: '💡',
    color: '#FFFBEB',
    title: 'Personalised Advice',
    desc: 'Actionable, evidence-based recommendations tailored to your specific risk factors.',
  },
]

export default function Landing() {
  return (
    <>
      <section className="landing-hero">
        <div className="landing-badge">
          <span>🩺</span>
          Evidence-based • Powered by CDC &amp; ADA data
        </div>
        <h1>
          Know your diabetes risk<br />
          <span>before symptoms appear</span>
        </h1>
        <p>
          Diabetes affects 1 in 10 adults — but 1 in 4 people with it don't know they have it.
          Answer 30 questions about your health and lifestyle to get your personalised risk score in under 5 minutes.
        </p>
        <div className="landing-actions">
          <Link to="/questionnaire" className="btn-primary">
            Start Free Assessment →
          </Link>
          <Link to="/dashboard" className="btn-secondary">
            View Dashboard
          </Link>
        </div>
      </section>

      <section className="landing-features">
        {features.map(f => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon" style={{ background: f.color }}>
              {f.icon}
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>
    </>
  )
}
