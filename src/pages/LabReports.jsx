import { useState, useEffect } from 'react'

const INITIAL = {
  hba1c: '', fastingGlucose: '', postMealGlucose: '',
  totalCholesterol: '', ldl: '', hdl: '', triglycerides: '',
  bloodPressure: '', heartRate: '',
  insulin: '', cPeptide: '',
  testDate: '',
}

function getRange(key, val) {
  const v = parseFloat(val)
  if (!val || isNaN(v)) return null
  const ranges = {
    hba1c:           { label: 'HbA1c',          normal: v < 5.7,            border: v >= 5.7 && v < 6.5,  unit: '%',    normalLabel: '<5.7%',    borderLabel: '5.7–6.4% (pre)',  highLabel: '≥6.5% (diabetic)' },
    fastingGlucose:  { label: 'Fasting Glucose', normal: v < 100,            border: v >= 100 && v < 126,  unit: 'mg/dL',normalLabel: '<100',     borderLabel: '100–125 (pre)',   highLabel: '≥126 (diabetic)' },
    postMealGlucose: { label: '2h Post-Meal Glucose', normal: v < 140,       border: v >= 140 && v < 200,  unit: 'mg/dL',normalLabel: '<140',     borderLabel: '140–199 (pre)',  highLabel: '≥200 (diabetic)' },
    totalCholesterol:{ label: 'Total Cholesterol',normal: v < 200,           border: v >= 200 && v < 240,  unit: 'mg/dL',normalLabel: '<200',     borderLabel: '200–239',        highLabel: '≥240 (high)' },
    ldl:             { label: 'LDL',             normal: v < 100,            border: v >= 100 && v < 130,  unit: 'mg/dL',normalLabel: '<100',     borderLabel: '100–129',        highLabel: '≥130' },
    hdl:             { label: 'HDL',             normal: v >= 60,            border: v >= 40 && v < 60,    unit: 'mg/dL',normalLabel: '≥60',      borderLabel: '40–59',          highLabel: '<40 (low)' },
    triglycerides:   { label: 'Triglycerides',   normal: v < 150,            border: v >= 150 && v < 200,  unit: 'mg/dL',normalLabel: '<150',     borderLabel: '150–199',        highLabel: '≥200' },
    bloodPressure:   { label: 'Systolic BP',     normal: v < 120,            border: v >= 120 && v < 130,  unit: 'mmHg', normalLabel: '<120',     borderLabel: '120–129',        highLabel: '≥130' },
    insulin:         { label: 'Fasting Insulin', normal: v >= 2 && v <= 25,  border: v > 25 && v <= 50,    unit: 'µIU/mL',normalLabel: '2–25',   borderLabel: '25–50',          highLabel: '>50 (high)' },
  }
  const r = ranges[key]
  if (!r) return null
  const status = r.normal ? 'normal' : r.border ? 'border' : 'high'
  const statusLabel = r.normal ? r.normalLabel : r.border ? r.borderLabel : r.highLabel
  const statusClass = r.normal ? 'normal' : r.border ? 'low' : 'high'
  // Special case: HDL — higher is better
  return { ...r, status, statusLabel, statusClass }
}

export default function LabReports() {
  const [form, setForm] = useState(INITIAL)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('asterLabData')
    if (stored) setForm({ ...INITIAL, ...JSON.parse(stored) })
  }, [])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSave = () => {
    localStorage.setItem('asterLabData', JSON.stringify(form))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const Field = ({ fieldKey, label, unit, placeholder, hint, step }) => {
    const range = getRange(fieldKey, form[fieldKey])
    return (
      <div className="field-group">
        <label className="field-label">{label} {unit && <span className="field-optional">{unit}</span>}</label>
        <input
          className="field-input"
          type="number"
          step={step || '1'}
          placeholder={placeholder}
          value={form[fieldKey]}
          onChange={e => set(fieldKey, e.target.value)}
        />
        {hint && <div className="field-hint">{hint}</div>}
        {range && form[fieldKey] && (
          <div className={`field-range ${range.statusClass}`}>
            {range.status === 'normal' ? '✓' : '⚠'} {range.statusLabel}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="lab-page">
      <h1>Lab Reports</h1>
      <p>Log your most recent blood test results. These values are stored locally on your device and used to improve your risk score.</p>

      {saved && (
        <div className="lab-saved-banner">
          ✓ Lab results saved successfully — your dashboard has been updated.
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, marginBottom: 24 }}>
        <div className="lab-section-title">Test Date</div>
        <div className="field-group" style={{ maxWidth: 220 }}>
          <input className="field-input" type="date" value={form.testDate} onChange={e => set('testDate', e.target.value)} />
        </div>

        <div className="lab-section-title" style={{ marginTop: 28 }}>Blood Glucose</div>
        <div className="lab-fields">
          <div className="lab-field-row">
            <Field fieldKey="hba1c" label="HbA1c" unit="%" placeholder="e.g. 5.7" step="0.1"
              hint="Reflects average blood sugar over the past 2–3 months" />
            <Field fieldKey="fastingGlucose" label="Fasting Glucose" unit="mg/dL" placeholder="e.g. 95"
              hint="Measured after at least 8 hours without eating" />
          </div>
          <div className="lab-field-row">
            <Field fieldKey="postMealGlucose" label="2hr Post-Meal Glucose" unit="mg/dL" placeholder="e.g. 130"
              hint="Measured 2 hours after a meal" />
            <Field fieldKey="insulin" label="Fasting Insulin" unit="µIU/mL" placeholder="e.g. 8"
              hint="High fasting insulin can indicate insulin resistance" />
          </div>
          <div className="lab-field-row">
            <Field fieldKey="cPeptide" label="C-Peptide" unit="ng/mL" placeholder="e.g. 1.5"
              hint="Distinguishes T1D (low/absent) from T2D. Normal: 0.5–2.0 ng/mL" />
          </div>
        </div>

        <div className="lab-section-title" style={{ marginTop: 28 }}>Cholesterol Panel (Lipids)</div>
        <div className="lab-fields">
          <div className="lab-field-row">
            <Field fieldKey="totalCholesterol" label="Total Cholesterol" unit="mg/dL" placeholder="e.g. 185" />
            <Field fieldKey="ldl" label="LDL ('Bad') Cholesterol" unit="mg/dL" placeholder="e.g. 110" />
          </div>
          <div className="lab-field-row">
            <Field fieldKey="hdl" label="HDL ('Good') Cholesterol" unit="mg/dL" placeholder="e.g. 55" />
            <Field fieldKey="triglycerides" label="Triglycerides" unit="mg/dL" placeholder="e.g. 130" />
          </div>
        </div>

        <div className="lab-section-title" style={{ marginTop: 28 }}>Vitals</div>
        <div className="lab-fields">
          <div className="lab-field-row">
            <Field fieldKey="bloodPressure" label="Systolic Blood Pressure" unit="mmHg" placeholder="e.g. 118"
              hint="The top number in a blood pressure reading" />
            <Field fieldKey="heartRate" label="Resting Heart Rate" unit="bpm" placeholder="e.g. 68" />
          </div>
        </div>

        <button className="btn-submit" onClick={handleSave} style={{ marginTop: 8 }}>
          Save Lab Results
        </button>
      </div>

      <div style={{ background: 'var(--primary-light)', border: '1px solid #BFDBFE', borderRadius: 'var(--radius)', padding: '16px 20px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text-primary)' }}>Why we ask:</strong> HbA1c and fasting glucose are the gold-standard tests for diagnosing
        prediabetes and diabetes. If your values fall in the prediabetes range, a 5–7% weight loss and 150 min/week of exercise
        reduces progression to diabetes by 58% (DPP trial). All data stays on your device — nothing is sent to any server.
      </div>
    </div>
  )
}
