import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import RiskGauge from '../components/RiskGauge'
import PopulationChart from '../components/PopulationChart'
import WorldComparison from '../components/WorldComparison'
import { calculateT2DRisk, calculateT1DRisk, getRecommendations, compareToPopulation } from '../utils/riskEngine'

export default function Results() {
  const [data, setData] = useState(null)

  useEffect(() => {
    const raw = localStorage.getItem('asterFormData')
    if (!raw) return
    const answers = JSON.parse(raw)
    const t2d = calculateT2DRisk(answers)
    const t1d = calculateT1DRisk(answers)
    const recs = getRecommendations(answers, t2d)
    const pop = compareToPopulation(answers.age, t2d.bmi, t2d.rawScore)
    setData({ answers, t2d, t1d, recs, pop })
  }, [])

  if (!data) {
    return (
      <div className="results-page">
        <div className="no-data-state">
          <div className="no-data-icon">📋</div>
          <div className="no-data-title">No assessment found</div>
          <div className="no-data-desc">Complete the questionnaire to see your personalised risk results.</div>
          <Link to="/questionnaire" className="btn-primary">Start Assessment</Link>
        </div>
      </div>
    )
  }

  const { answers, t2d, t1d, recs, pop } = data

  return (
    <div className="results-page">
      <div className="results-header">
        <h1>Your Risk Assessment Results{answers.name ? ` — ${answers.name}` : ''}</h1>
        <p>Based on your responses and the FINDRISC diabetes risk model</p>
      </div>

      {/* Risk gauges */}
      <div className="risk-cards">
        <div className="risk-card">
          <div className="risk-card-title">Type 2 Diabetes Risk</div>
          <RiskGauge percent={t2d.percent} riskBadgeClass={t2d.riskBadgeClass} />
          <div>
            <div className={`risk-badge ${t2d.riskBadgeClass}`}>
              {t2d.riskLevel} Risk
            </div>
            <div className="risk-prob" style={{marginTop:8}}>
              ~{t2d.probability}% 10-year probability
            </div>
            {t2d.bmi && (
              <div style={{marginTop:8,fontSize:'0.82rem',color:'var(--text-muted)'}}>
                BMI: {t2d.bmi.toFixed(1)} — {t2d.bmiCategory}
              </div>
            )}
          </div>
        </div>

        <div className="risk-card">
          <div className="risk-card-title">Autoimmune / Type 1 Risk</div>
          <RiskGauge percent={t1d.percent} riskBadgeClass={t1d.riskBadgeClass} />
          <div>
            <div className={`risk-badge ${t1d.riskBadgeClass}`}>
              {t1d.riskLevel} Risk
            </div>
            <div className="risk-prob" style={{marginTop:8}}>
              Based on autoimmune markers &amp; family history
            </div>
            <div style={{marginTop:8,fontSize:'0.78rem',color:'var(--text-muted)'}}>
              Includes T1D, thyroid, rheumatoid &amp; celiac risk
            </div>
          </div>
        </div>
      </div>

      {/* Risk factors */}
      {t2d.factors.length > 0 && (
        <div className="section-card">
          <h2>Your Risk Factors</h2>
          <div className="risk-factors-list">
            {t2d.factors.map(f => (
              <div key={f.label} className="risk-factor-item">
                <div className="risk-factor-name">{f.label}</div>
                <div className="risk-factor-bar-wrap">
                  <div
                    className={`risk-factor-bar ${f.impactClass}`}
                    style={{ width: `${f.pct}%` }}
                  />
                </div>
                <div className="risk-factor-score">{f.pts}/{f.max}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Population comparison */}
      <div className="section-card">
        <h2>How You Compare to the Population</h2>
        <div className="pop-chart-wrap">
          <PopulationChart comparisonData={pop} />
        </div>
        <div style={{fontSize:'0.78rem',color:'var(--text-muted)',textAlign:'center',marginBottom:20}}>
          Blue bar = your age group ({pop.myAgeGroup.label}). Source: CDC NHANES 2017–2020
        </div>
        <div className="pop-stats">
          <div className="pop-stat">
            <div className="pop-stat-value">{pop.myAgeGroupPrevalence}%</div>
            <div className="pop-stat-label">of your age group ({pop.myAgeGroup.label}) has diabetes</div>
          </div>
          <div className="pop-stat">
            <div className="pop-stat-value">{pop.myPrediabetesPrevalence}%</div>
            <div className="pop-stat-label">of your age group has prediabetes</div>
          </div>
          <div className="pop-stat">
            <div className="pop-stat-value" style={{color: pop.userProbability > 10 ? 'var(--danger)' : 'var(--primary)'}}>
              {pop.userProbability}%
            </div>
            <div className="pop-stat-label">your estimated 10-year diabetes probability</div>
          </div>
        </div>
      </div>

      {/* HbA1c context */}
      {answers.hba1c && (
        <div className="section-card">
          <h2>Your Lab Values in Context</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:16}}>
            {[
              { label: 'HbA1c', val: `${answers.hba1c}%`, range: answers.hba1c < 5.7 ? 'Normal (<5.7%)' : answers.hba1c < 6.5 ? 'Prediabetes' : 'Diabetic range', rangeClass: answers.hba1c < 5.7 ? 'normal' : answers.hba1c < 6.5 ? 'low' : 'high' },
              answers.fastingGlucose && { label: 'Fasting Glucose', val: `${answers.fastingGlucose} mg/dL`, range: answers.fastingGlucose < 100 ? 'Normal (<100)' : answers.fastingGlucose < 126 ? 'Prediabetes' : 'Diabetic range', rangeClass: answers.fastingGlucose < 100 ? 'normal' : answers.fastingGlucose < 126 ? 'low' : 'high' },
              answers.bloodPressure && { label: 'Blood Pressure (sys.)', val: `${answers.bloodPressure} mmHg`, range: answers.bloodPressure < 120 ? 'Normal' : answers.bloodPressure < 130 ? 'Elevated' : 'High', rangeClass: answers.bloodPressure < 120 ? 'normal' : answers.bloodPressure < 130 ? 'low' : 'high' },
            ].filter(Boolean).map(item => (
              <div key={item.label} style={{padding:'16px',background:'var(--bg)',borderRadius:'var(--radius)',border:'1px solid var(--border)'}}>
                <div style={{fontSize:'0.78rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{item.label}</div>
                <div style={{fontSize:'1.5rem',fontWeight:700,letterSpacing:'-0.03em'}}>{item.val}</div>
                <div className={`field-range ${item.rangeClass}`}>{item.range}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="section-card">
        <h2>Personalised Recommendations</h2>
        <div className="recs-list">
          {recs.map((r, i) => (
            <div key={i} className={`rec-item ${r.itemClass}`}>
              <div className="rec-icon">{r.icon}</div>
              <div className="rec-content">
                <div className={`rec-priority ${r.priorityClass}`}>{r.priority}</div>
                <h4>{r.title}</h4>
                <p>{r.description}</p>
                <div className="rec-action">→ {r.action}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* World comparison — IDF Atlas data */}
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 20 }}>
          How You Compare to the World
        </h2>
        <WorldComparison answers={answers} t2dRisk={t2d} />
      </div>

      {/* CTAs */}
      <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:8}}>
        <Link to="/dashboard" className="btn-primary">View Health Dashboard →</Link>
        <Link to="/cgm" className="btn-secondary">Connect CGM Device</Link>
        <Link to="/lab-reports" className="btn-secondary">Add Lab Results</Link>
        <Link to="/questionnaire" className="btn-secondary">Retake Assessment</Link>
      </div>

      <div style={{marginTop:32,padding:'16px 20px',background:'var(--bg-secondary)',borderRadius:'var(--radius)',fontSize:'0.78rem',color:'var(--text-muted)',lineHeight:1.7}}>
        <strong>Disclaimer:</strong> This assessment is for informational purposes only and does not constitute medical advice.
        Risk scores are calculated using published epidemiological models (FINDRISC, CDC NHANES). Only a qualified healthcare
        professional can diagnose diabetes. If you have concerns, please consult your doctor.
      </div>
    </div>
  )
}
