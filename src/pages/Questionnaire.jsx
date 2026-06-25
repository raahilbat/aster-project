import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { calculateBMI, getBMICategory, getBMICSSClass } from '../utils/riskEngine'

const STEPS = [
  {
    id: 'basic',
    label: 'Step 1 of 5',
    title: 'Basic Information',
    desc: 'We use this to calculate your BMI and age-adjusted risk.',
  },
  {
    id: 'history',
    label: 'Step 2 of 5',
    title: 'Family & Medical History',
    desc: 'Select all that apply. Family history is one of the strongest diabetes predictors.',
  },
  {
    id: 'symptoms',
    label: 'Step 3 of 5',
    title: 'Symptoms',
    desc: 'How often have you experienced these in the past 3 months?',
  },
  {
    id: 'lifestyle',
    label: 'Step 4 of 5',
    title: 'Lifestyle & Habits',
    desc: 'Your daily habits significantly influence diabetes risk.',
  },
  {
    id: 'labdata',
    label: 'Step 5 of 5',
    title: 'Lab & Health Data',
    desc: 'Optional — but if you have recent blood test results they make your score much more accurate.',
  },
]

const INITIAL = {
  name: '', age: '', gender: '', height: '', weight: '',
  familyDiabetes: [], existingConditions: [], autoimmuneHistory: [],
  previousHighBloodSugar: '',
  thirstUrination: '', fatigue: '', tingleNumbness: '', blurredVision: '',
  slowHealing: '', weightLoss: '', darkSkinPatches: '', frequentInfections: '',
  exerciseDays: '', exerciseIntensity: '', diet: '', vegetableServings: '',
  sleep: '', smoking: '', alcohol: '', stress: '',
  hba1c: '', fastingGlucose: '', bloodPressure: '', cgmDevice: 'None', fitnessTracker: 'None',
}

function ProgressBar({ step, total }) {
  return (
    <div className="q-progress-bar">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`q-progress-step ${i < step ? 'done' : i === step ? 'active' : ''}`}
        />
      ))}
    </div>
  )
}

function MultiSelect({ options, value, onChange }) {
  const toggle = opt => {
    if (opt === 'None') { onChange(['None']); return }
    const next = value.filter(v => v !== 'None')
    onChange(next.includes(opt) ? next.filter(v => v !== opt) : [...next, opt])
  }
  return (
    <div className="multiselect-grid">
      {options.map(opt => (
        <label key={opt} className={`multiselect-option ${value.includes(opt) ? 'selected' : ''}`}>
          <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)} />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  )
}

function FrequencySelect({ value, onChange }) {
  const opts = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always']
  return (
    <div className="frequency-grid">
      {opts.map(o => (
        <button
          key={o}
          type="button"
          className={`freq-btn ${value === o ? 'selected' : ''}`}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function YesNo({ value, onChange }) {
  return (
    <div className="yesno-group">
      <button type="button" className={`yesno-btn ${value === 'Yes' ? 'selected-yes' : ''}`} onClick={() => onChange('Yes')}>Yes</button>
      <button type="button" className={`yesno-btn ${value === 'No' ? 'selected-no' : ''}`} onClick={() => onChange('No')}>No</button>
    </div>
  )
}

export default function Questionnaire() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(INITIAL)
  const navigate = useNavigate()

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const bmi = form.height && form.weight ? calculateBMI(form.height, form.weight) : null
  const bmiCat = bmi ? getBMICategory(bmi) : ''
  const bmiClass = bmi ? getBMICSSClass(bmi) : ''

  const handleSubmit = () => {
    localStorage.setItem('asterFormData', JSON.stringify(form))
    navigate('/results')
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="q-fields">
            <div className="field-group">
              <label className="field-label">Full Name</label>
              <input className="field-input" type="text" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">Age</label>
                <input className="field-input" type="number" min="18" max="110" placeholder="e.g. 42" value={form.age} onChange={e => set('age', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Gender</label>
                <select className="field-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other / Prefer not to say</option>
                </select>
              </div>
            </div>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">Height (cm)</label>
                <input className="field-input" type="number" placeholder="e.g. 170" value={form.height} onChange={e => set('height', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Weight (kg)</label>
                <input className="field-input" type="number" placeholder="e.g. 75" value={form.weight} onChange={e => set('weight', e.target.value)} />
              </div>
            </div>
            {bmi && (
              <div className="bmi-display">
                <div className={`bmi-value ${bmiClass}`}>
                  BMI: <strong>{bmi.toFixed(1)}</strong> — {bmiCat}
                </div>
              </div>
            )}
          </div>
        )

      case 1:
        return (
          <div className="q-fields">
            <div className="field-group">
              <label className="field-label">Family diabetes history <span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Select all that apply</span></label>
              <MultiSelect
                options={['Mother', 'Father', 'Sibling', 'Grandparent', 'None']}
                value={form.familyDiabetes}
                onChange={v => set('familyDiabetes', v)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Do you have any of these conditions? <span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Select all that apply</span></label>
              <MultiSelect
                options={['Prediabetes', 'High Blood Pressure', 'High Cholesterol', 'Insulin Resistance', 'PCOS', 'Gestational Diabetes', 'None']}
                value={form.existingConditions}
                onChange={v => set('existingConditions', v)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Autoimmune disease history (you or a close family member) <span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Select all that apply</span></label>
              <MultiSelect
                options={['Type 1 Diabetes', 'Rheumatoid Arthritis', 'Lupus', 'Celiac Disease', 'Thyroid Disease', 'None', 'Unsure']}
                value={form.autoimmuneHistory}
                onChange={v => set('autoimmuneHistory', v)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Have you ever had a high blood sugar reading?</label>
              <select className="field-select" value={form.previousHighBloodSugar} onChange={e => set('previousHighBloodSugar', e.target.value)}>
                <option value="">Select an option</option>
                <option>Yes</option>
                <option>No</option>
                <option>Never tested</option>
              </select>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="q-fields">
            {[
              { key: 'thirstUrination', label: 'Excessive thirst or frequent urination', type: 'freq' },
              { key: 'fatigue', label: 'Unusual fatigue or low energy', type: 'freq' },
              { key: 'tingleNumbness', label: 'Tingling or numbness in hands/feet', type: 'freq' },
              { key: 'blurredVision', label: 'Blurred vision', type: 'freq' },
              { key: 'slowHealing', label: 'Slow-healing wounds or cuts', type: 'freq' },
              { key: 'frequentInfections', label: 'Frequent yeast or urinary infections', type: 'freq' },
              { key: 'weightLoss', label: 'Unexplained weight loss', type: 'yesno' },
              { key: 'darkSkinPatches', label: 'Dark skin patches (neck, armpits, or groin)', type: 'yesno' },
            ].map(q => (
              <div key={q.key} className="field-group">
                <label className="field-label">{q.label}</label>
                {q.type === 'freq'
                  ? <FrequencySelect value={form[q.key]} onChange={v => set(q.key, v)} />
                  : <YesNo value={form[q.key]} onChange={v => set(q.key, v)} />
                }
              </div>
            ))}
          </div>
        )

      case 3:
        return (
          <div className="q-fields">
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">Exercise days per week</label>
                <select className="field-select" value={form.exerciseDays} onChange={e => set('exerciseDays', e.target.value)}>
                  <option value="">Select</option>
                  {['0','1','2','3','4','5','6','7'].map(v => <option key={v}>{v} {v==='1'?'day':'days'}</option>)}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Exercise intensity</label>
                <select className="field-select" value={form.exerciseIntensity} onChange={e => set('exerciseIntensity', e.target.value)}>
                  <option value="">Select</option>
                  <option>Light (walking, stretching)</option>
                  <option>Moderate (jogging, cycling, swimming)</option>
                  <option>Vigorous (running, HIIT, heavy lifting)</option>
                  <option>N/A — no exercise</option>
                </select>
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Typical diet</label>
              <select className="field-select" value={form.diet} onChange={e => set('diet', e.target.value)}>
                <option value="">Select</option>
                <option>Mostly whole foods (vegetables, legumes, lean proteins, whole grains)</option>
                <option>Balanced mix</option>
                <option>High in processed foods</option>
                <option>High in sugar</option>
                <option>Other</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Daily servings of vegetables and fruit</label>
              <select className="field-select" value={form.vegetableServings} onChange={e => set('vegetableServings', e.target.value)}>
                <option value="">Select</option>
                <option value="0">0 servings</option>
                <option value="1-2">1–2 servings</option>
                <option value="3+">3 or more servings</option>
              </select>
            </div>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">Average sleep per night</label>
                <select className="field-select" value={form.sleep} onChange={e => set('sleep', e.target.value)}>
                  <option value="">Select</option>
                  <option>Less than 5 hours</option>
                  <option>5-6 hours</option>
                  <option>7-8 hours</option>
                  <option>More than 8 hours</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Stress level</label>
                <select className="field-select" value={form.stress} onChange={e => set('stress', e.target.value)}>
                  <option value="">Select</option>
                  <option>Low</option>
                  <option>Moderate</option>
                  <option>High</option>
                  <option>Very High</option>
                </select>
              </div>
            </div>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">Smoking status</label>
                <select className="field-select" value={form.smoking} onChange={e => set('smoking', e.target.value)}>
                  <option value="">Select</option>
                  <option>Never smoked</option>
                  <option>Former smoker</option>
                  <option>Current smoker</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Alcohol consumption</label>
                <select className="field-select" value={form.alcohol} onChange={e => set('alcohol', e.target.value)}>
                  <option value="">Select</option>
                  <option>None</option>
                  <option>Occasional (1-2 per week)</option>
                  <option>Moderate (3-7 per week)</option>
                  <option>Heavy (daily)</option>
                </select>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="q-fields">
            <div style={{padding:'12px 16px',background:'var(--primary-light)',borderRadius:'var(--radius)',fontSize:'0.85rem',color:'var(--primary)',marginBottom:4}}>
              All fields on this step are optional, but they significantly improve accuracy.
            </div>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">HbA1c <span className="field-optional">optional</span></label>
                <input className="field-input" type="number" step="0.1" min="3" max="20" placeholder="e.g. 5.7" value={form.hba1c} onChange={e => set('hba1c', e.target.value)} />
                <div className="field-hint">Normal: &lt;5.7% | Prediabetes: 5.7–6.4% | Diabetes: ≥6.5%</div>
              </div>
              <div className="field-group">
                <label className="field-label">Fasting glucose (mg/dL) <span className="field-optional">optional</span></label>
                <input className="field-input" type="number" placeholder="e.g. 95" value={form.fastingGlucose} onChange={e => set('fastingGlucose', e.target.value)} />
                <div className="field-hint">Normal: &lt;100 | Prediabetes: 100–125 | Diabetes: ≥126</div>
              </div>
            </div>
            <div className="field-group">
              <label className="field-label">Systolic blood pressure (mmHg) <span className="field-optional">optional</span></label>
              <input className="field-input" type="number" placeholder="e.g. 120" style={{maxWidth:200}} value={form.bloodPressure} onChange={e => set('bloodPressure', e.target.value)} />
            </div>
            <div className="two-col">
              <div className="field-group">
                <label className="field-label">CGM device <span className="field-optional">if any</span></label>
                <select className="field-select" value={form.cgmDevice} onChange={e => set('cgmDevice', e.target.value)}>
                  <option>None</option>
                  <option>Dexcom G6</option>
                  <option>Dexcom G7</option>
                  <option>FreeStyle Libre 2</option>
                  <option>FreeStyle Libre 3</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Fitness tracker <span className="field-optional">if any</span></label>
                <select className="field-select" value={form.fitnessTracker} onChange={e => set('fitnessTracker', e.target.value)}>
                  <option>None</option>
                  <option>Fitbit</option>
                  <option>Apple Watch</option>
                  <option>Garmin</option>
                  <option>Samsung Galaxy Watch</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="questionnaire-page">
      <ProgressBar step={step} total={STEPS.length} />

      <div className="q-header">
        <div className="q-step-label">{STEPS[step].label}</div>
        <h2>{STEPS[step].title}</h2>
        <p>{STEPS[step].desc}</p>
      </div>

      {renderStep()}

      <div className="q-nav">
        <button
          className="btn-back"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          style={{ opacity: step === 0 ? 0 : 1, pointerEvents: step === 0 ? 'none' : 'auto' }}
        >
          ← Back
        </button>

        {step < STEPS.length - 1 ? (
          <button className="btn-next" onClick={() => setStep(s => s + 1)}>
            Continue →
          </button>
        ) : (
          <button className="btn-submit" onClick={handleSubmit}>
            See My Results ✓
          </button>
        )}
      </div>
    </div>
  )
}
