// lightweight online ML anomaly detector.
// Same interface as ruleBased.js: detect(reading) -> { anomaly, confidence, severity, reason }
//
// Approach: exponentially-weighted moving mean/variance per metric (per
// profile), updated on every tick. Each new reading is scored by how many
// standard deviations it sits from the current learned mean (z-score) — no
// labeled training data needed, and it adapts to drift (e.g. a user's
// baseline heart rate rising during a workout) instead of using fixed
// thresholds like ruleBased.js.

const ALPHA = 0.05; // adaptation rate: lower = slower-forgetting baseline
const WARMUP_TICKS = 20; // don't flag anomalies until we've learned a baseline
const Z_MEDIUM = 3; // ~ p < 0.003 under a normal approximation
const Z_HIGH = 4.5;
const MIN_STD = { heartRate: 1.5, spo2: 0.3, accelMag: 0.05 }; // floor to avoid div-by-~0 on quiet signals

// Per-profile running stats, keyed by profile name. Each metric tracks an
// EWMA mean and an EWMA of squared deviation (a streaming variance proxy).
const state = new Map();

function getStats(profile) {
  if (!state.has(profile)) {
    state.set(profile, {
      ticks: 0,
      heartRate: { mean: null, var: 0 },
      spo2: { mean: null, var: 0 },
      accelMag: { mean: null, var: 0 },
    });
  }
  return state.get(profile);
}

// Updates the EWMA mean/variance for one metric and returns the z-score of
// `value` against the state *before* this update (so the current point is
// judged against history, not against itself).
function updateAndScore(metricState, value, minStd) {
  if (metricState.mean === null) {
    metricState.mean = value;
    metricState.var = 0;
    return 0;
  }

  const std = Math.max(Math.sqrt(metricState.var), minStd);
  const z = (value - metricState.mean) / std;

  const delta = value - metricState.mean;
  metricState.mean += ALPHA * delta;
  metricState.var = (1 - ALPHA) * (metricState.var + ALPHA * delta * delta);

  return z;
}

function zToConfidence(z) {
  // Logistic squashing centered on the medium threshold so confidence
  // climbs smoothly from ~0.5 at the detection boundary toward ~0.99.
  const x = Math.abs(z) - Z_MEDIUM;
  return Math.min(0.99, 1 / (1 + Math.exp(-x)));
}

function detect(reading) {
  const profile = reading.profile || "normal";
  const stats = getStats(profile);
  stats.ticks += 1;

  const zHr = updateAndScore(stats.heartRate, reading.heartRate, MIN_STD.heartRate);
  const zSpo2 = updateAndScore(stats.spo2, reading.spo2, MIN_STD.spo2);
  const zAccel = updateAndScore(stats.accelMag, reading.accelMag, MIN_STD.accelMag);

  if (stats.ticks <= WARMUP_TICKS) {
    // Still learning a baseline — don't flag anything yet.
    return { anomaly: false, confidence: 0, severity: "none", reason: null };
  }

  const candidates = [
    { metric: "Heart rate", z: zHr, label: `Heart rate deviating from learned baseline at ${reading.heartRate} bpm` },
    { metric: "SpO2", z: zSpo2, label: `SpO2 deviating from learned baseline at ${reading.spo2}%` },
    { metric: "Accel", z: zAccel, label: `Movement deviating from learned baseline at ${reading.accelMag}g` },
  ];

  const worst = candidates.reduce((a, b) => (Math.abs(b.z) > Math.abs(a.z) ? b : a));

  if (Math.abs(worst.z) < Z_MEDIUM) {
    return { anomaly: false, confidence: 0, severity: "none", reason: null };
  }

  const severity = Math.abs(worst.z) >= Z_HIGH ? "high" : "medium";
  return {
    anomaly: true,
    confidence: Number(zToConfidence(worst.z).toFixed(2)),
    severity,
    reason: `${worst.label} (z=${worst.z.toFixed(2)})`,
  };
}

// Exposed for tests / debugging only — not part of the detector.js contract.
function _resetState() {
  state.clear();
}

module.exports = { detect, _resetState };