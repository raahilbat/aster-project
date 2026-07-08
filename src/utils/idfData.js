// IDF Diabetes Atlas — 10th Edition (2021)
// Source: International Diabetes Federation, diabetesatlas.org
// All figures: adults aged 20–79 unless noted

export const IDF_GLOBAL = {
  year: 2021,
  edition: '10th Edition',
  source: 'IDF Diabetes Atlas 2021',

  // Headline numbers
  diabetesTotal:      537,   // million adults living with diabetes
  diabetesPrevalence: 10.5,  // % of global adult population (20–79)
  undiagnosed:        240,   // million — 1 in 2 are undiagnosed
  undiagnosedPct:     50,    // % of all diabetes cases that are undiagnosed
  prediabetes:        541,   // million with impaired glucose tolerance
  deaths:             6.7,   // million deaths attributed to diabetes in 2021
  healthSpend:        966,   // billion USD spent on diabetes globally

  // Projections
  projection2030: 643,  // million
  projection2045: 783,  // million

  // Type 1
  type1Total:     8.4,   // million worldwide with T1D
  type1Under20:   1.2,   // million children/adolescents under 20 with T1D

  // Low/middle income
  lowMidIncomePct: 75,  // % of people with diabetes living in low/middle-income countries
}

// Prevalence by IDF region (age-adjusted comparative prevalence %)
export const IDF_REGIONS = [
  { region: 'Middle East & N. Africa', code: 'MENA', prevalence: 16.2, total: 73,  projected2045: 144 },
  { region: 'North America',           code: 'NAC',  prevalence: 12.1, total: 51,  projected2045: 63  },
  { region: 'South-East Asia',         code: 'SEA',  prevalence: 11.3, total: 90,  projected2045: 152 },
  { region: 'Western Pacific',         code: 'WP',   prevalence: 10.6, total: 206, projected2045: 260 },
  { region: 'South & Central America', code: 'SACA', prevalence: 10.1, total: 32,  projected2045: 49  },
  { region: 'Europe',                  code: 'EUR',  prevalence: 9.2,  total: 61,  projected2045: 69  },
  { region: 'Africa',                  code: 'AFR',  prevalence: 5.3,  total: 24,  projected2045: 55  },
]

// Top 10 countries by total number of adults with diabetes (millions)
export const TOP_COUNTRIES = [
  { country: 'China',       total: 140.9, prevalence: 12.8 },
  { country: 'India',       total: 74.2,  prevalence: 9.6  },
  { country: 'Pakistan',    total: 33.0,  prevalence: 26.7 },
  { country: 'USA',         total: 32.2,  prevalence: 12.1 },
  { country: 'Brazil',      total: 15.7,  prevalence: 10.2 },
  { country: 'Nigeria',     total: 11.5,  prevalence: 5.3  },
  { country: 'Bangladesh',  total: 13.1,  prevalence: 14.2 },
  { country: 'Russia',      total: 10.2,  prevalence: 9.1  },
  { country: 'Mexico',      total: 14.1,  prevalence: 16.9 },
  { country: 'Ethiopia',    total: 4.4,   prevalence: 5.0  },
]

// Global prevalence by age group (% with diabetes)
export const GLOBAL_BY_AGE = [
  { group: '20–24', prevalence: 2.2  },
  { group: '25–29', prevalence: 3.0  },
  { group: '30–34', prevalence: 4.1  },
  { group: '35–39', prevalence: 5.9  },
  { group: '40–44', prevalence: 8.5  },
  { group: '45–49', prevalence: 11.8 },
  { group: '50–54', prevalence: 15.4 },
  { group: '55–59', prevalence: 18.9 },
  { group: '60–64', prevalence: 22.3 },
  { group: '65–69', prevalence: 24.8 },
  { group: '70–74', prevalence: 25.9 },
  { group: '75–79', prevalence: 24.2 },
]

// BMI-based relative risk (IDF/WHO combined)
export const BMI_RISK = [
  { category: 'Underweight (<18.5)', multiplier: 0.6 },
  { category: 'Normal (18.5–24.9)',  multiplier: 1.0 },
  { category: 'Overweight (25–29.9)',multiplier: 2.2 },
  { category: 'Obese I (30–34.9)',   multiplier: 3.8 },
  { category: 'Obese II (35–39.9)',  multiplier: 5.1 },
  { category: 'Obese III (40+)',     multiplier: 6.4 },
]

// Global glucose tolerance status breakdown (adults 20–79)
export const GLUCOSE_STATUS = [
  { label: 'Normal',      pct: 55.4, color: '#10B981' },
  { label: 'Prediabetes', pct: 34.1, color: '#F59E0B' },
  { label: 'Diabetes',    pct: 10.5, color: '#EF4444' },
]

// Helper — find closest age group
export function getAgeGroupPrevalence(age) {
  const a = parseInt(age)
  const group = GLOBAL_BY_AGE.find((g, i) => {
    const [lo, hi] = g.group.split('–').map(Number)
    return a >= lo && a <= hi
  }) || GLOBAL_BY_AGE[GLOBAL_BY_AGE.length - 1]
  return group.prevalence
}

// Generate a user-specific world comparison summary
export function buildWorldComparison(answers, t2dRisk) {
  const age         = parseInt(answers.age || 40)
  const bmi         = t2dRisk.bmi || 25
  const riskPct     = t2dRisk.probability  // user's estimated 10-yr probability
  const agePrevalence = getAgeGroupPrevalence(age)

  // How many people globally share this age group prevalence
  const globalAdults  = 5100   // million adults 20–79
  const withDiabetes  = Math.round(globalAdults * (agePrevalence / 100))

  // BMI multiplier vs world average
  const bmiEntry    = BMI_RISK.find(b => {
    if (bmi < 18.5) return b.category.includes('Underweight')
    if (bmi < 25)   return b.category.includes('Normal')
    if (bmi < 30)   return b.category.includes('Overweight')
    if (bmi < 35)   return b.category.includes('Obese I')
    if (bmi < 40)   return b.category.includes('Obese II')
    return b.category.includes('Obese III')
  })
  const bmiMultiplier = bmiEntry?.multiplier || 1.0

  // Percentile — what share of the global population has LOWER risk
  // Rough estimate: risk score maps to global percentile
  const riskPercentile = Math.min(97, Math.round(
    (riskPct / 50) * 80 + 10   // scale 0-50% prob → 10-90th percentile
  ))

  return {
    globalDiabetesTotal:  IDF_GLOBAL.diabetesTotal,
    globalPrevalence:     IDF_GLOBAL.diabetesPrevalence,
    globalUndiagnosed:    IDF_GLOBAL.undiagnosed,
    globalPrediabetes:    IDF_GLOBAL.prediabetes,
    ageGroupPrevalence: agePrevalence,
    withDiabetesInAgeGroup: withDiabetes,
    bmiMultiplier,
    riskPercentile,
    userRiskPct: riskPct,
    projection2045: IDF_GLOBAL.projection2045,
  }
}
