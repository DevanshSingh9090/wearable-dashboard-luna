const { createGenerator } = require("../simulator/generator");
const detector = require("../anomaly/detector");

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

  // Single global simulation loop, broadcast to every connected client via
  // io.emit (not socket.emit inside the connection handler). One shared
  // interval — not one per connection — is what keeps concurrent clients in
  // sync and avoids duplicate/drifting timers per the brief's requirement.
  const nextReading = createGenerator("normal");
  setInterval(() => {
    const reading = nextReading();
    io.emit("sensor:data", reading);

    const result = detector.detect(reading);
    if (result.anomaly) {
      io.emit("anomaly:detected", {
        ...result,
        reading,
        timestamp: reading.timestamp,
      });
      console.log(
        `[anomaly] ${result.severity} (confidence ${result.confidence.toFixed(2)}) - ${result.reason}`
      );
    }

    if (reading.injectedAnomaly) {
      console.log(`[simulator] injected ${reading.injectedAnomaly}`, reading);
    }
  }, TICK_MS);
}

module.exports = socketHandler;