// Placeholder for Phase 9 (optional). Must expose the same interface as
// ruleBased.js: detect(reading) -> { anomaly, confidence, severity, reason }
// Do not wire this up until you actually train/plug in a model — leave
// DETECTOR_MODE=rule (or unset) in your .env until then.

function detect(reading) {
  throw new Error(
    "mlModel.detect() not implemented yet (Phase 9 pending). Set DETECTOR_MODE=rule in .env for now."
  );
}

module.exports = { detect };