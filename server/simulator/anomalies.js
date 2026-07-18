// Each anomaly type has a per-tick probability and a mutator that distorts
// a base reading to simulate that event. Checked in order; first match wins
// so multiple anomalies don't stack on the same tick.
const ANOMALY_TYPES = {
  highHeartRate: {
    probability: 0.02,
    apply: (reading) => ({
      ...reading,
      heartRate: reading.heartRate + 40 + Math.random() * 20,
    }),
  },
  lowSpo2: {
    probability: 0.015,
    apply: (reading) => ({
      ...reading,
      spo2: Math.max(70, reading.spo2 - (8 + Math.random() * 6)),
    }),
  },
  fall: {
    probability: 0.01,
    apply: (reading) => ({
      ...reading,
      accelMag: reading.accelMag + 3 + Math.random() * 2,
    }),
  },
  randomSpike: {
    probability: 0.01,
    apply: (reading) => ({
      ...reading,
      heartRate: reading.heartRate + (Math.random() - 0.5) * 30,
      spo2: reading.spo2 - Math.random() * 3,
    }),
  },
};

// Decide if any anomaly fires this tick. Returns the (possibly mutated)
// reading plus a label naming which anomaly was injected, or null.
function maybeInjectAnomaly(reading) {
  for (const [type, config] of Object.entries(ANOMALY_TYPES)) {
    if (Math.random() < config.probability) {
      return { reading: config.apply(reading), injected: type };
    }
  }
  return { reading, injected: null };
}

module.exports = { ANOMALY_TYPES, maybeInjectAnomaly };