// Single entry point for anomaly detection. Everything else in the app
// (socketHandler, routes, tests) should call detector.detect() and never
// ruleBased.js or mlModel.js directly — this is the only file that decides
// which engine runs (per ROADMAP.md rule #2).

const ruleBased = require("./ruleBased");

const MODE = process.env.DETECTOR_MODE || "rule"; // "rule" | "ml"

let mlModel = null;
if (MODE === "ml") {
  // Loaded lazily so the app doesn't crash if mlModel.js isn't implemented
  // yet — Phase 9 is optional per the roadmap.
  mlModel = require("./mlModel");
}

function detect(reading) {
  if (MODE === "ml" && mlModel) {
    return mlModel.detect(reading);
  }
  return ruleBased.detect(reading);
}

module.exports = { detect };