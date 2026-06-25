# Aster Health — Diabetes Risk Assessment

A browser-based health risk assessment app built with React and Vite. It assesses a user's risk of Type 2 diabetes and autoimmune/Type 1 diabetes using a clinically grounded questionnaire, visualises results with charts, compares them against real population data, and supports CGM data integration from FreeStyle Libre and Dexcom.

All data is stored locally in the browser (localStorage). Nothing is sent to any server.

---

## Features

- **Multi-step questionnaire** — 30 questions across 5 steps: basic info, medical/family history, symptoms, lifestyle, and optional lab data
- **FINDRISC-based risk scoring** — weighted algorithm covering age, BMI, physical activity, diet, symptoms, existing conditions, family history, and lifestyle factors
- **Separate T1D/autoimmune risk score** — based on autoimmune markers, family history, and symptom patterns
- **Population comparison** — CDC NHANES 2017–2020 data showing diabetes prevalence by age group, with your group highlighted
- **CGM integration** — upload a FreeStyle Libre CSV export, or use the Dexcom API guide; demo data available for both
- **CGM metrics** — average glucose, Time-in-Range (TIR), Glucose Management Indicator (GMI), coefficient of variation (CV%)
- **Lab reports** — log HbA1c, fasting glucose, cholesterol panel, blood pressure, insulin, C-peptide with colour-coded normal ranges
- **Personalised recommendations** — evidence-based actions tailored to your specific risk factors

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Install and run

```bash
npm install
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173).

### Build for production

```bash
npm run build
npm run preview
```

---

## Project Structure

```
aster-project/
├── index.html                  # Vite entry point
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                # React root
    ├── App.jsx                 # Router and layout
    ├── styles/
    │   └── globals.css         # Design system (CSS variables, all component styles)
    ├── utils/
    │   ├── riskEngine.js       # Risk scoring algorithms and recommendations
    │   └── cgmParser.js        # FreeStyle Libre CSV parser, Dexcom JSON parser, CGM metrics
    ├── components/
    │   ├── Navbar.jsx
    │   ├── RiskGauge.jsx       # Doughnut-based gauge chart
    │   ├── PopulationChart.jsx # Bar chart — CDC age-group prevalence
    │   ├── GlucoseChart.jsx    # Line chart — CGM glucose trace
    │   └── TIRChart.jsx        # Doughnut — Time in Range breakdown
    └── pages/
        ├── Landing.jsx
        ├── Questionnaire.jsx   # 5-step multi-step form
        ├── Results.jsx         # Risk scores, factors, population comparison, recommendations
        ├── Dashboard.jsx       # Health overview with CGM and lab data
        ├── LabReports.jsx      # Manual lab result entry
        └── CGMIntegration.jsx  # Libre CSV upload, Dexcom guide, Nightscout, demo data
```

---

## Risk Scoring

### Type 2 Diabetes (FINDRISC-adapted)

| Factor | Max points |
|---|---|
| Age | 4 |
| BMI | 3 |
| Physical activity | 2 |
| Diet quality + vegetable intake | 4 |
| Symptoms (thirst, fatigue, tingling, etc.) | 15 |
| Existing conditions (prediabetes, PCOS, etc.) | 18 |
| Family history | 5 |
| Lifestyle (sleep, smoking, alcohol, stress) | 8 |
| Prior high blood sugar reading | 5 |

If HbA1c or fasting glucose values are entered, lab values override the symptom-based estimate when higher.

**Risk bands:**

| Score | Level | ~10-year probability |
|---|---|---|
| 0–7 | Low | 1% |
| 8–13 | Slightly Elevated | 4% |
| 14–20 | Moderate | 17% |
| 21–28 | High | 33% |
| 29+ | Very High | 50% |

### Type 1 / Autoimmune Risk

Scored separately based on: age of onset pattern, autoimmune disease history (T1D, rheumatoid, celiac, thyroid, lupus), first-degree family history of T1D, rapid-onset symptom pattern, and unexplained weight loss.

---

## CGM Integration

### FreeStyle Libre

Export your data from [LibreView.com](https://www.libreview.com): Account → Reports → Export Raw Data → CSV. Upload it on the CGM page.

The parser reads Record Type 0 (automatic historic readings every 15 min) and Record Type 1 (manual scans), converts mmol/L to mg/dL, and calculates all metrics.

### Dexcom

Dexcom has a public OAuth2 API at [developer.dexcom.com](https://developer.dexcom.com). A production integration requires a backend to securely exchange OAuth tokens. The app's `parseDexcomData()` function in `cgmParser.js` accepts the standard Dexcom v3 `/egvs` response and normalises it to the same format used for Libre data.

A sandbox environment is available for development without a real device.

### Nightscout

For users who self-host [Nightscout](https://nightscout.github.io), the app can query `/api/v1/entries.json` directly. Nightscout aggregates data from Dexcom, FreeStyle Libre (via xDrip+), Medtronic, and most other CGM devices.

### CGM Metrics

| Metric | Definition |
|---|---|
| Time-in-Range (TIR) | % of readings between 70–180 mg/dL (ADA target: ≥70%) |
| Glucose Management Indicator (GMI) | Estimated HbA1c: `3.31 + 0.02392 × mean glucose (mg/dL)` |
| CV% | Coefficient of variation — glucose variability (target: <36%) |
| Standard deviation | Spread of glucose values |

---

## Population Data Sources

- **CDC NHANES 2017–2020** — diabetes and prediabetes prevalence by age group, baked in as static JSON
- **ADA/EASD clinical guidelines** — Time-in-Range targets and HbA1c classification thresholds
- **Diabetes Prevention Program (DPP) Trial** — basis for lifestyle intervention recommendations (58% risk reduction)

---

## Privacy

All data (questionnaire responses, lab values, CGM readings) is stored exclusively in the browser's `localStorage`. No data is transmitted to any server. Clearing your browser data or localStorage removes everything.

---

## Tech Stack

| Library | Purpose |
|---|---|
| React 18 | UI components |
| React Router v6 | Client-side routing |
| Vite 5 | Build tool and dev server |
| Chart.js + react-chartjs-2 | Risk gauges, glucose chart, TIR donut, population bar chart |
| PapaParse | CSV parsing (FreeStyle Libre exports) |

---

## Roadmap

- [ ] Dexcom PKCE OAuth flow (frontend-only, no backend needed)
- [ ] Fitness tracker integration (Fitbit API, Apple HealthKit via iOS shortcut)
- [ ] Multi-session tracking — retake assessment over time and see risk trend
- [ ] PDF export of risk report
- [ ] Nightscout live fetch with auto-refresh
- [ ] Libre 3 real-time Bluetooth (via Web Bluetooth API, experimental)

---

## Disclaimer

This application is for informational and educational purposes only. It does not constitute medical advice, diagnosis, or treatment. Risk scores are calculated using published epidemiological models (FINDRISC, CDC NHANES). Only a qualified healthcare professional can diagnose diabetes or related conditions. If you have concerns about your health, please consult your doctor.
