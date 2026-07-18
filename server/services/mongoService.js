const Event = require("../models/Event");

async function saveEvent({ insightId, timestamp, reading, severity, confidence, reason }) {
  const event = new Event({ insightId, timestamp, reading, severity, confidence, reason });
  return event.save();
}

async function updateEventInsight(insightId, { text, status, error }) {
  return Event.findOneAndUpdate(
    { insightId },
    {
      "aiInsight.text": text,
      "aiInsight.status": status,
      "aiInsight.error": error || null,
    },
    { new: true }
  );
}

async function getHistory(limit = 50) {
  return Event.find({}).sort({ timestamp: -1 }).limit(limit).lean();
}

module.exports = { saveEvent, updateEventInsight, getHistory };