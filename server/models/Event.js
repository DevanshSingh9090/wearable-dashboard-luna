const mongoose = require("mongoose");

// One document per detected anomaly. insightId links this record back to
// the same anomaly the client saw over the socket, so the AI insight text
// can be patched in once Gemini finishes (see aiInsight.status below).
const EventSchema = new mongoose.Schema(
  {
    insightId: { type: String, required: true, unique: true },
    timestamp: { type: Number, required: true }, // epoch ms, matches client Date.now()
    reading: {
      heartRate: Number,
      spo2: Number,
      accelMag: Number,
    },
    severity: { type: String, enum: ["low", "medium", "high"], required: true },
    confidence: { type: Number, required: true },
    reason: { type: String, required: true },
    aiInsight: {
      text: { type: String, default: "" },
      status: { type: String, enum: ["pending", "done", "error"], default: "pending" },
      error: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", EventSchema);