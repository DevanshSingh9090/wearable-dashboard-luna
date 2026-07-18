const { createGenerator } = require("../simulator/generator");
const detector = require("../anomaly/detector");
const geminiService = require("../services/geminiService");
const mongoService = require("../services/mongoService");

const TICK_MS = 1000;

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.emit("server:ready", {
      message: "Connected to wearable dashboard backend",
    });

    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id} (${reason})`);
    });
  });

  const nextReading = createGenerator("normal");
  setInterval(() => {
    const reading = nextReading();
    io.emit("sensor:data", reading);

    const result = detector.detect(reading);
    if (result.anomaly) {
      const insightId = `${reading.timestamp}-${Math.random().toString(36).slice(2, 8)}`;

      io.emit("anomaly:detected", {
        ...result,
        reading,
        timestamp: reading.timestamp,
        insightId,
      });
      console.log(
        `[anomaly] ${result.severity} (confidence ${result.confidence.toFixed(2)}) - ${result.reason}`
      );

      mongoService
        .saveEvent({
          insightId,
          timestamp: reading.timestamp,
          reading: { heartRate: reading.heartRate, spo2: reading.spo2, accelMag: reading.accelMag },
          severity: result.severity,
          confidence: result.confidence,
          reason: result.reason,
        })
        .catch((err) => console.error("[mongo] failed to save event:", err.message));

      geminiService.streamInsight(
        { reading, severity: result.severity, confidence: result.confidence, reason: result.reason },
        (chunk) => io.emit("ai:chunk", { insightId, chunk }),
        (fullText) => {
          io.emit("ai:done", { insightId, fullText });
          mongoService
            .updateEventInsight(insightId, { text: fullText, status: "done" })
            .catch((err) => console.error("[mongo] failed to update insight:", err.message));
        },
        (err) => {
          console.error("[gemini] streaming error:", err.message);
          io.emit("ai:error", { insightId, message: err.message });
          mongoService
            .updateEventInsight(insightId, { text: "", status: "error", error: err.message })
            .catch((updateErr) => console.error("[mongo] failed to update insight:", updateErr.message));
        }
      );
    }

    if (reading.injectedAnomaly) {
      console.log(`[simulator] injected ${reading.injectedAnomaly}`, reading);
    }
  }, TICK_MS);
}

module.exports = socketHandler;