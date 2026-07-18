const mongoService = require("../services/mongoService");

async function getEvents(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const events = await mongoService.getHistory(limit);
    res.json({ events });
  } catch (err) {
    console.error("[eventController] failed to fetch events:", err.message);
    res.status(500).json({ error: "Failed to fetch event history" });
  }
}

module.exports = { getEvents };