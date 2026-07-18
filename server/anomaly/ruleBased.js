// Threshold-based anomaly detection (Phase 4 MVP).
// Given a single sensor reading, decides if it's anomalous and returns a
// confidence score + severity + human-readable reason.
// Same interface as mlModel.js so detector.js can swap engines freely.

const THRESHOLDS = {
  heartRate: { low: 50, high: 120, criticalHigh: 150, criticalLow: 40 },
  spo2: { low: 92, critical: 85 },
  accelMag: { high: 2.5, critical: 4.5 }, // fall-like impact
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function checkHeartRate(hr) {
  if (hr >= THRESHOLDS.heartRate.criticalHigh || hr <= THRESHOLDS.heartRate.criticalLow) {
    return {
      anomaly: true,
      severity: "high",
      confidence: clamp(0.85 + Math.abs(hr - 100) / 500, 0, 0.99),
      reason: `Heart rate critically abnormal at ${hr} bpm`,
    };
  }
  if (hr >= THRESHOLDS.heartRate.high || hr <= THRESHOLDS.heartRate.low) {
    const distance =
      hr > THRESHOLDS.heartRate.high ? hr - THRESHOLDS.heartRate.high : THRESHOLDS.heartRate.low - hr;
    return {
      anomaly: true,
      severity: "medium",
      confidence: clamp(0.5 + distance / 100, 0.5, 0.85),
      reason: `Heart rate outside normal range at ${hr} bpm`,
    };
  }
  return null;
}

function checkSpo2(spo2) {
  if (spo2 <= THRESHOLDS.spo2.critical) {
    return {
      anomaly: true,
      severity: "high",
      confidence: clamp(0.85 + (THRESHOLDS.spo2.critical - spo2) / 50, 0, 0.99),
      reason: `SpO2 critically low at ${spo2}%`,
    };
  }
  if (spo2 <= THRESHOLDS.spo2.low) {
    return {
      anomaly: true,
      severity: "medium",
      confidence: clamp(0.5 + (THRESHOLDS.spo2.low - spo2) / 20, 0.5, 0.85),
      reason: `SpO2 below normal at ${spo2}%`,
    };
  }
  return null;
}

function checkAccel(accelMag) {
  if (accelMag >= THRESHOLDS.accelMag.critical) {
    return {
      anomaly: true,
      severity: "high",
      confidence: clamp(0.85 + (accelMag - THRESHOLDS.accelMag.critical) / 10, 0, 0.99),
      reason: `Possible fall detected — acceleration spike at ${accelMag}g`,
    };
  }
  if (accelMag >= THRESHOLDS.accelMag.high) {
    return {
      anomaly: true,
      severity: "medium",
      confidence: clamp(0.5 + (accelMag - THRESHOLDS.accelMag.high) / 5, 0.5, 0.85),
      reason: `Unusual movement — acceleration at ${accelMag}g`,
    };
  }
  return null;
}

// Runs all metric checks and returns the single most severe hit (highest
// confidence wins), matching the "first match wins" style used in
// anomalies.js so behavior stays predictable when multiple metrics trip at
// the same tick.
function detect(reading) {
  const checks = [checkHeartRate(reading.heartRate), checkSpo2(reading.spo2), checkAccel(reading.accelMag)].filter(
    Boolean
  );

  if (checks.length === 0) {
    return { anomaly: false, confidence: 0, severity: "none", reason: null };
  }

  checks.sort((a, b) => b.confidence - a.confidence);
  return checks[0];
}

module.exports = { detect, THRESHOLDS };