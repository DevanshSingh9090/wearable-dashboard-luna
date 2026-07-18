const { getProfile } = require("./profiles");
const { maybeInjectAnomaly } = require("./anomalies");

// Cheap approx-normal noise (sum of uniforms), avoids a full Box-Muller for
// something this low-stakes.
function noise(variance) {
  return (Math.random() + Math.random() + Math.random() - 1.5) * (variance / 1.5);
}

function baseReading(profileName, t) {
  const profile = getProfile(profileName);
  return {
    heartRate:
      profile.heartRate.base +
      Math.sin(t / 15) * (profile.heartRate.variance / 2) +
      noise(profile.heartRate.variance),
    spo2:
      profile.spo2.base +
      Math.sin(t / 40) * (profile.spo2.variance / 2) +
      noise(profile.spo2.variance),
    accelMag: Math.max(
      0,
      profile.accelMag.base +
        Math.sin(t / 5) * (profile.accelMag.variance / 2) +
        noise(profile.accelMag.variance)
    ),
  };
}

// Returns a stateful function: each call produces the next reading for one
// simulated user. State (tick counter) is closed over, not global, so
// multiple profiles could run side by side later if needed.
function createGenerator(profileName = "normal") {
  let t = 0;

  return function nextReading() {
    t += 1;
    const base = baseReading(profileName, t);
    const { reading, injected } = maybeInjectAnomaly(base);

    return {
      profile: profileName,
      timestamp: Date.now(),
      heartRate: Number(reading.heartRate.toFixed(1)),
      spo2: Number(Math.min(100, reading.spo2).toFixed(1)),
      accelMag: Number(reading.accelMag.toFixed(2)),
      injectedAnomaly: injected, // null unless this tick was a deliberate injection
    };
  };
}

module.exports = { createGenerator };