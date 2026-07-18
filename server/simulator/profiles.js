// Baseline + variance per metric for each simulated user type.
// generator.js samples around `base` with amplitude `variance`.
const PROFILES = {
  normal: {
    heartRate: { base: 72, variance: 6 },
    spo2: { base: 97.5, variance: 1 },
    accelMag: { base: 1.0, variance: 0.2 },
  },
  athlete: {
    heartRate: { base: 58, variance: 5 },
    spo2: { base: 98, variance: 0.8 },
    accelMag: { base: 1.3, variance: 0.4 },
  },
  senior: {
    heartRate: { base: 78, variance: 8 },
    spo2: { base: 95.5, variance: 1.5 },
    accelMag: { base: 0.7, variance: 0.15 },
  },
  stress: {
    heartRate: { base: 95, variance: 10 },
    spo2: { base: 96, variance: 1.2 },
    accelMag: { base: 1.1, variance: 0.3 },
  },
};

function getProfile(name = "normal") {
  return PROFILES[name] || PROFILES.normal;
}

module.exports = { PROFILES, getProfile };