const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

function buildPrompt({ reading, severity, confidence, reason }) {
  return `You are a clinical monitoring assistant reviewing a wearable sensor anomaly.

Anomaly detected:
- Reason: ${reason}
- Severity: ${severity}
- Confidence: ${(confidence * 100).toFixed(0)}%
- Heart Rate: ${reading.heartRate} bpm
- SpO2: ${reading.spo2}%
- Acceleration Magnitude: ${reading.accelMag} g

In 2-3 short sentences, explain what this anomaly could mean and suggest one practical next step. Be concise and calm, avoid alarming language, and do not provide a medical diagnosis.`;
}

async function streamInsight(anomaly, onChunk, onDone, onError) {
  if (!ai) {
    onError(new Error("GEMINI_API_KEY is not set in .env"));
    return;
  }

  try {
    const prompt = buildPrompt(anomaly);
    const response = await ai.models.generateContentStream({
      model: MODEL,
      contents: prompt,
    });

    let fullText = "";
    for await (const chunk of response) {
      const text = chunk.text || "";
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }
    onDone(fullText);
  } catch (err) {
    onError(err);
  }
}

module.exports = { streamInsight, buildPrompt };