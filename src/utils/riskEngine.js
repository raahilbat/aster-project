// FINDRISC-based Type 2 Diabetes risk scoring + T1D/autoimmune risk assessment

export function calculateBMI(heightCm, weightKg) {
  const h = parseFloat(heightCm) / 100;
  const w = parseFloat(weightKg);
  if (!h || !w) return null;
  return w / (h * h);
}

export function getBMICategory(bmi) {
  if (!bmi) return '';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Obese (Class I)';
  if (bmi < 40) return 'Obese (Class II)';
  return 'Obese (Class III)';
}

export function getBMICSSClass(bmi) {
  if (!bmi) return '';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

// ── Score components ──────────────────────────────────────

function agePoints(age) {
  const a = parseInt(age);
  if (a < 35) return 0;
  if (a < 45) return 1;
  if (a < 55) return 2;
  if (a < 65) return 3;
  return 4;
}

function bmiPoints(bmi) {
  if (!bmi) return 0;
  if (bmi < 25) return 0;
  if (bmi < 30) return 1;
  if (bmi < 35) return 2;
  return 3;
}

function activityPoints(days) {
  const d = parseInt(days || 0);
  if (d >= 4) return 0;
  if (d >= 2) return 1;
  return 2;
}

function dietPoints(diet, vegServings) {
  let pts = 0;
  if (diet === 'High in processed foods' || diet === 'High in sugar') pts += 2;
  else if (diet === 'Balanced mix') pts += 1;
  if (vegServings === '0') pts += 2;
  else if (vegServings === '1-2') pts += 1;
  return pts;
}

function symptomPoints(answers) {
  const freqScore = { Never: 0, Rarely: 1, Sometimes: 2, Often: 3, Always: 3 };
  const freqFields = ['thirstUrination', 'fatigue', 'tingleNumbness', 'blurredVision', 'slowHealing', 'frequentInfections'];
  let pts = 0;
  freqFields.forEach(f => {
    const v = freqScore[answers[f]] || 0;
    if (v >= 3) pts += 2;
    else if (v >= 2) pts += 1;
  });
  if (answers.weightLoss === 'Yes') pts += 2;
  if (answers.darkSkinPatches === 'Yes') pts += 3; // acanthosis nigricans — strong T2D marker
  return pts;
}

function conditionPoints(conditions) {
  if (!conditions || conditions.length === 0 || conditions.includes('None')) return 0;
  let pts = 0;
  if (conditions.includes('Prediabetes')) pts += 5;
  if (conditions.includes('High Blood Pressure')) pts += 2;
  if (conditions.includes('High Cholesterol')) pts += 2;
  if (conditions.includes('Insulin Resistance')) pts += 4;
  if (conditions.includes('PCOS')) pts += 3;
  if (conditions.includes('Gestational Diabetes')) pts += 4;
  return pts;
}

function familyPoints(familyDiabetes) {
  if (!familyDiabetes || familyDiabetes.includes('None')) return 0;
  const close = familyDiabetes.some(f => ['Mother', 'Father', 'Sibling'].includes(f));
  const distant = familyDiabetes.includes('Grandparent');
  if (close) return 5;
  if (distant) return 3;
  return 0;
}

function lifestylePoints(answers) {
  let pts = 0;
  if (answers.sleep === 'Less than 5 hours') pts += 2;
  else if (answers.sleep === '5-6 hours' || answers.sleep === 'More than 8 hours') pts += 1;
  if (answers.smoking === 'Current smoker') pts += 2;
  else if (answers.smoking === 'Former smoker') pts += 1;
  if (answers.alcohol === 'Heavy (daily)') pts += 2;
  else if (answers.alcohol === 'Moderate (3-7/week)') pts += 1;
  if (answers.stress === 'Very High') pts += 2;
  else if (answers.stress === 'High') pts += 1;
  return pts;
}

function labPoints(hba1c, fastingGlucose) {
  let pts = 0;
  if (hba1c) {
    const v = parseFloat(hba1c);
    if (v >= 6.5) pts += 15;
    else if (v >= 5.7) pts += 8;
  }
  if (fastingGlucose) {
    const v = parseFloat(fastingGlucose);
    if (v >= 126) pts += 15;
    else if (v >= 100) pts += 8;
  }
  return Math.min(pts, 15); // cap lab contribution at 15 to avoid double-counting
}

// ── Main T2D risk calculator ──────────────────────────────

export function calculateT2DRisk(answers) {
  const bmi = calculateBMI(answers.height, answers.weight);

  const components = {
    age:        { pts: agePoints(answers.age),                           max: 4,  label: 'Age' },
    bmi:        { pts: bmiPoints(bmi),                                   max: 3,  label: 'Body weight (BMI)' },
    activity:   { pts: activityPoints(answers.exerciseDays),             max: 2,  label: 'Physical activity' },
    diet:       { pts: dietPoints(answers.diet, answers.vegetableServings), max: 4, label: 'Diet quality' },
    symptoms:   { pts: symptomPoints(answers),                           max: 15, label: 'Symptoms' },
    conditions: { pts: conditionPoints(answers.existingConditions),      max: 18, label: 'Existing conditions' },
    family:     { pts: familyPoints(answers.familyDiabetes),             max: 5,  label: 'Family history' },
    lifestyle:  { pts: lifestylePoints(answers),                         max: 8,  label: 'Lifestyle factors' },
    prevGlucose:{ pts: answers.previousHighBloodSugar === 'Yes' ? 5 : 0, max: 5,  label: 'Prior high blood sugar' },
  };

  let rawScore = Object.values(components).reduce((sum, c) => sum + c.pts, 0);

  // Lab values override if significantly elevated
  const lab = labPoints(answers.hba1c, answers.fastingGlucose);
  if (lab > 0) rawScore = Math.max(rawScore, lab);

  const MAX = 45;
  const percent = Math.min(100, Math.round((rawScore / MAX) * 100));

  let riskLevel, probability, riskBadgeClass;
  if (rawScore <= 7)       { riskLevel = 'Low';              probability = 1;  riskBadgeClass = 'low'; }
  else if (rawScore <= 13) { riskLevel = 'Slightly Elevated'; probability = 4;  riskBadgeClass = 'slightly'; }
  else if (rawScore <= 20) { riskLevel = 'Moderate';         probability = 17; riskBadgeClass = 'moderate'; }
  else if (rawScore <= 28) { riskLevel = 'High';             probability = 33; riskBadgeClass = 'high'; }
  else                     { riskLevel = 'Very High';        probability = 50; riskBadgeClass = 'very-high'; }

  const factors = Object.values(components)
    .filter(c => c.pts > 0)
    .map(c => ({
      label: c.label,
      pts: c.pts,
      max: c.max,
      pct: Math.round((c.pts / c.max) * 100),
      impactClass: c.pts / c.max >= 0.6 ? 'high-impact' : c.pts / c.max >= 0.3 ? 'mod-impact' : 'low-impact',
    }))
    .sort((a, b) => b.pct - a.pct);

  return { rawScore, percent, riskLevel, riskBadgeClass, probability, bmi, bmiCategory: getBMICategory(bmi), factors };
}

// ── T1D / Autoimmune risk ─────────────────────────────────

export function calculateT1DRisk(answers) {
  let score = 0;
  const age = parseInt(answers.age || 30);

  if (age < 20) score += 4;
  else if (age < 30) score += 3;
  else if (age < 40) score += 1;

  const autoimmune = answers.autoimmuneHistory || [];
  if (autoimmune.includes('Type 1 Diabetes')) score += 10;
  if (autoimmune.some(a => ['Rheumatoid Arthritis', 'Lupus', 'Celiac Disease', 'Thyroid Disease'].includes(a))) score += 4;

  const family = answers.familyDiabetes || [];
  if (family.some(f => ['Mother', 'Father', 'Sibling'].includes(f))) score += 3;

  // Rapid onset symptom pattern (T1D red flag)
  if (answers.thirstUrination === 'Always' || answers.thirstUrination === 'Often') score += 2;
  if (answers.weightLoss === 'Yes') score += 4;
  if (answers.fatigue === 'Always' || answers.fatigue === 'Often') score += 1;

  // T1D often presents in normal/low weight individuals
  const bmi = calculateBMI(answers.height, answers.weight);
  if (bmi && bmi < 25 && score >= 5) score += 2;

  const MAX = 25;
  const percent = Math.min(100, Math.round((score / MAX) * 100));

  let riskLevel, riskBadgeClass;
  if (score <= 3)       { riskLevel = 'Low';      riskBadgeClass = 'low'; }
  else if (score <= 8)  { riskLevel = 'Moderate'; riskBadgeClass = 'moderate'; }
  else if (score <= 14) { riskLevel = 'High';     riskBadgeClass = 'high'; }
  else                  { riskLevel = 'Very High'; riskBadgeClass = 'very-high'; }

  return { score, percent, riskLevel, riskBadgeClass };
}

// ── Recommendations ───────────────────────────────────────

export function getRecommendations(answers, t2dResult) {
  const recs = [];
  const bmi = t2dResult.bmi;
  const days = parseInt(answers.exerciseDays || 0);
  const rl = t2dResult.riskLevel;

  if (rl === 'High' || rl === 'Very High') {
    recs.push({
      priority: 'Critical', priorityClass: 'critical', itemClass: 'critical',
      icon: '🏥', category: 'Medical',
      title: 'See a doctor soon',
      description: 'Your risk profile warrants professional evaluation. An HbA1c blood test can confirm or rule out prediabetes or diabetes.',
      action: 'Book an appointment with your GP or endocrinologist within the next 2 weeks',
    });
  }

  if (bmi && bmi > 25) {
    recs.push({
      priority: 'High', priorityClass: 'high', itemClass: 'high-p',
      icon: '⚖️', category: 'Weight Management',
      title: 'Work toward a healthier weight',
      description: `Your BMI is ${bmi.toFixed(1)} (${t2dResult.bmiCategory}). A 5–7% reduction in body weight can reduce diabetes risk by up to 58% (Diabetes Prevention Program Trial).`,
      action: 'Target 0.5–1 kg per week through sustainable diet changes and increased activity',
    });
  }

  if (days < 3) {
    recs.push({
      priority: 'High', priorityClass: 'high', itemClass: 'high-p',
      icon: '🏃', category: 'Physical Activity',
      title: 'Increase physical activity',
      description: '150 min/week of moderate exercise (brisk walking, cycling) reduces T2D risk by 58% and improves insulin sensitivity.',
      action: 'Start with 30-minute brisk walks on 5 days per week — no gym required',
    });
  }

  if (['High in processed foods', 'High in sugar'].includes(answers.diet)) {
    recs.push({
      priority: 'High', priorityClass: 'high', itemClass: 'high-p',
      icon: '🥗', category: 'Diet',
      title: 'Reduce processed foods and sugar',
      description: 'Processed foods and added sugars spike blood glucose and promote insulin resistance over time.',
      action: 'Replace one processed meal per day with whole foods — vegetables, legumes, whole grains, lean protein',
    });
  }

  if (answers.vegetableServings === '0') {
    recs.push({
      priority: 'Moderate', priorityClass: 'moderate', itemClass: 'moderate-p',
      icon: '🥦', category: 'Diet',
      title: 'Eat more vegetables and fibre',
      description: 'Dietary fibre slows glucose absorption, reducing post-meal blood sugar spikes and improving gut health.',
      action: 'Add one serving of non-starchy vegetables (spinach, broccoli, peppers) to each meal',
    });
  }

  if (answers.sleep === 'Less than 5 hours' || answers.sleep === '5-6 hours') {
    recs.push({
      priority: 'Moderate', priorityClass: 'moderate', itemClass: 'moderate-p',
      icon: '😴', category: 'Sleep',
      title: 'Improve sleep duration',
      description: 'Short sleep raises cortisol and ghrelin, which increase blood sugar and promote weight gain.',
      action: 'Aim for 7–8 hours per night. Keep a consistent sleep/wake schedule',
    });
  }

  if (answers.smoking === 'Current smoker') {
    recs.push({
      priority: 'High', priorityClass: 'high', itemClass: 'high-p',
      icon: '🚭', category: 'Lifestyle',
      title: 'Quit smoking',
      description: 'Smokers are 30–40% more likely to develop T2D. Nicotine impairs insulin action directly.',
      action: 'Speak with your doctor about cessation aids — nicotine patches, varenicline (Champix), or bupropion',
    });
  }

  if (answers.stress === 'High' || answers.stress === 'Very High') {
    recs.push({
      priority: 'Moderate', priorityClass: 'moderate', itemClass: 'moderate-p',
      icon: '🧘', category: 'Stress',
      title: 'Manage chronic stress',
      description: 'Cortisol released during chronic stress raises blood glucose and promotes abdominal fat storage.',
      action: 'Try 10 minutes of daily mindfulness, guided breathing, or moderate-intensity exercise for stress relief',
    });
  }

  if (!answers.hba1c && (rl === 'Moderate' || rl === 'High' || rl === 'Very High')) {
    recs.push({
      priority: 'Moderate', priorityClass: 'moderate', itemClass: 'moderate-p',
      icon: '🩸', category: 'Monitoring',
      title: 'Get baseline lab work',
      description: 'You haven\'t provided HbA1c or fasting glucose values. Objective lab values give you a definitive baseline.',
      action: 'Request an HbA1c and fasting plasma glucose test at your next doctor visit',
    });
  }

  if (rl === 'Low' && recs.length === 0) {
    recs.push({
      priority: 'Low', priorityClass: 'low', itemClass: 'low-p',
      icon: '✅', category: 'Prevention',
      title: 'Maintain your healthy habits',
      description: 'Your current risk is low. Staying active, eating well, and keeping a healthy weight are your best long-term defences.',
      action: 'Schedule a routine health check every 1–2 years to monitor baseline glucose and metabolic health',
    });
  }

  return recs;
}

// ── Population comparison (CDC NHANES 2017–2020) ──────────

export function compareToPopulation(age, bmi, rawScore) {
  const ageGroups = [
    { label: '18–24', min: 18, max: 24, prevalence: 2.0, prediabetes: 19.5 },
    { label: '25–34', min: 25, max: 34, prevalence: 3.5, prediabetes: 22.0 },
    { label: '35–44', min: 35, max: 44, prevalence: 6.2, prediabetes: 30.1 },
    { label: '45–54', min: 45, max: 54, prevalence: 13.8, prediabetes: 38.4 },
    { label: '55–64', min: 55, max: 64, prevalence: 20.1, prediabetes: 44.0 },
    { label: '65–74', min: 65, max: 74, prevalence: 26.8, prediabetes: 48.8 },
    { label: '75+',   min: 75, max: 120, prevalence: 29.2, prediabetes: 51.0 },
  ];

  const a = parseInt(age || 30);
  const myGroup = ageGroups.find(g => a >= g.min && a <= g.max) || ageGroups[0];

  let bmiPrevalence = 3.9;
  const b = parseFloat(bmi);
  if (b < 18.5) bmiPrevalence = 2.0;
  else if (b < 25) bmiPrevalence = 3.9;
  else if (b < 30) bmiPrevalence = 9.1;
  else if (b < 35) bmiPrevalence = 17.4;
  else if (b < 40) bmiPrevalence = 21.8;
  else bmiPrevalence = 24.9;

  const userProbability = rawScore <= 7 ? 1 : rawScore <= 13 ? 4 : rawScore <= 20 ? 17 : rawScore <= 28 ? 33 : 50;
  const percentile = Math.min(98, Math.round(rawScore * 2.1));

  return { ageGroups, myAgeGroup: myGroup, myAgeGroupPrevalence: myGroup.prevalence, myPrediabetesPrevalence: myGroup.prediabetes, bmiPrevalence, userProbability, percentile };
}
