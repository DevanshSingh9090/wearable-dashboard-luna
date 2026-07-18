function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Phase 2 smoke test only. Phase 3 replaces this with real sensor ticks,
    // Phase 6 adds ai:token / ai:done events for Gemini streaming.
    socket.emit("server:ready", {
      message: "Connected to wearable dashboard backend",
    });

    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id} (${reason})`);
    });
  });
}

module.exports = socketHandler;