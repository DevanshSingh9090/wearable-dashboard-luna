# Real-Time Wearable Intelligence Dashboard

A full-stack system that streams simulated wearable sensor data (heart rate, SpO2, accelerometer)
over WebSocket, evaluates the stream continuously for anomalies, and generates a live, token-by-token
AI insight whenever one is detected.

Built for: **Task 01 — Real-Time Wearable Intelligence Dashboard**

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Socket Events Reference](#socket-events-reference)
- [Switching Detector Modes (Rule vs ML)](#switching-detector-modes-rule-vs-ml)
- [REST API](#rest-api)
- [Screenshots](#screenshots)
- [Design Decisions](#design-decisions)
- [Future Work](#future-work)
- [Demo & Code Walkthrough](#demo--code-walkthrough)

---

## Features

| Requirement (from brief) | Implementation ||---|---|
| Simulated wearable sensor stream over WebSocket | `server/simulator/*` generates a reading every second per profile; broadcast via Socket.IO |
| Continuous anomaly evaluation | Pluggable detector — rule-based thresholds (default) or an online ML model, both run on every tick |
| Streaming LLM insight on each detection | Gemini `generateContentStream` piped chunk-by-chunk over the socket — **no full-response buffering** |
| Real-time animated charts + live alert feed | Recharts line charts (rolling 60-point window) + a live-updating alert table |
| Confidence scores + timestamp history per event | Every anomaly is persisted to MongoDB with `confidence`, `severity`, `reason`, and `timestamp` |
| Concurrent WebSocket connections, no data loss | Single shared broadcast loop (`io.emit`) — every connected client sees the same consistent stream, no per-client desync risk |
| Token-by-token LLM streaming into the UI | `ai:chunk` events append text into React state as they arrive; a blinking cursor shows it's live |

---

## Architecture

```
                     ┌─────────────────────┐
                     │   React Dashboard    │
                     │  (Vite + Recharts)   │
                     └──────────▲───────────┘
                                │ Socket.IO (WS)
                                │ REST (history)
                     ┌──────────┴───────────┐
                     │   Express + Socket.IO │
                     │        Server         │
                     └──────────▲───────────┘
                                │
                     ┌──────────┴───────────┐
                     │  Sensor Simulation    │
                     │  Engine (1 tick/sec)  │
                     └──────────▲───────────┘
                                │
                     ┌──────────┴───────────┐
                     │  Anomaly Detection    │
                     │       Layer           │
                     │  ┌─────────────────┐  │
                     │  │  Rule-Based      │  │
                     │  │  (thresholds)    │  │
                     │  ├─────────────────┤  │
                     │  │  ML (online      │  │
                     │  │  EWMA z-score)   │  │
                     │  └─────────────────┘  │
                     └──────────▲───────────┘
                                │ on anomaly
                     ┌──────────┴───────────┐
                     │   Gemini AI Service   │
                     │  (token-by-token)     │
                     └──────────▲───────────┘
                                │
                     ┌──────────┴───────────┐
                     │       MongoDB         │
                     │  (event persistence)  │
                     └───────────────────────┘
```

**Data flow per tick:**
1. `generator.js` produces one reading (heart rate, SpO2, accel magnitude) for the active profile, with a small chance of an injected anomaly (high HR, low SpO2, fall, random spike).
2. The reading is broadcast to all connected clients via `sensor:data`.
3. The active detector (`detector.js` — rule-based or ML) scores the reading.
4. If anomalous: the event is saved to MongoDB immediately (`status: pending`), broadcast via `anomaly:detected`, and a Gemini streaming call is kicked off.
5. Gemini's response streams back chunk-by-chunk; each chunk is forwarded over the socket as `ai:chunk` the instant it arrives. When done, the full text patches the MongoDB record (`status: done`).

---

## Tech Stack

- **Frontend:** React 19 (Vite), Recharts, Socket.IO client, Axios
- **Backend:** Node.js, Express 5, Socket.IO
- **Database:** MongoDB (Mongoose)
- **AI:** Google Gemini (`@google/genai`, streaming API)
- **Detection:** Custom rule-based threshold engine + custom online (EWMA/z-score) ML engine — no external ML framework required

---

## Folder Structure

```
wearable-dashboard/
client/
 └── src/
      ├── components/   Dashboard, MetricCard, LiveChart, AIInsight, HistoryTable, ConnectionStatus, ErrorBoundary
      ├── pages/        Home.jsx
      ├── services/     socket.js, api.js
      └── App.jsx, main.jsx
server/
 ├── config/       db.js
 ├── simulator/     generator.js, profiles.js, anomalies.js
 ├── anomaly/       detector.js, ruleBased.js, mlModel.js
 ├── services/      geminiService.js, mongoService.js
 ├── socket/        socketHandler.js
 ├── models/        Event.js
 ├── routes/        eventRoutes.js
 ├── controllers/    eventController.js
 └── app.js, server.js
README.md
ROADMAP.md
```

---

## Setup

### Prerequisites
- Node.js 18+
- A MongoDB connection string (local or Atlas free tier)
- A Gemini API key ([Google AI Studio](https://aistudio.google.com/apikey))

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables

Create `server/.env` (see [Environment Variables](#environment-variables) below for the full list).

### 3. Run

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

Health check: `GET http://localhost:5000/health` → `{ "status": "ok" }`

---

## Environment Variables

Set these in `server/.env`:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `5000` | Backend server port |
| `MONGO_URI` | **Yes** | — | MongoDB connection string; server exits on startup if missing |
| `CLIENT_URL` | No | `http://localhost:5173` | Allowed CORS origin for REST + Socket.IO |
| `GEMINI_API_KEY` | **Yes** | — | Required for AI insight generation; without it, `ai:error` fires on each anomaly |
| `GEMINI_MODEL` | No | `gemini-flash-latest` | Override the Gemini model used for streaming |
| `DETECTOR_MODE` | No | `rule` | `rule` or `ml` — selects the anomaly detection engine |

Example `server/.env`:

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/wearable-dashboard
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-flash-latest
DETECTOR_MODE=rule
```

---

## Socket Events Reference

**Server → Client**

| Event | Payload | When |
|---|---|---|
| `server:ready` | `{ message }` | On connection |
| `sensor:data` | `{ profile, timestamp, heartRate, spo2, accelMag, injectedAnomaly }` | Every tick (1/sec) |
| `anomaly:detected` | `{ anomaly, confidence, severity, reason, reading, timestamp, insightId }` | When detector flags a reading |
| `ai:chunk` | `{ insightId, chunk }` | Once per streamed token/chunk from Gemini |
| `ai:done` | `{ insightId, fullText }` | When the Gemini stream completes |
| `ai:error` | `{ insightId, message }` | If the Gemini call fails |

**Client → Server:** none currently (sensor stream is server-driven/broadcast; see [Future Work](#future-work) for a proposed manual-trigger event).

---

## Switching Detector Modes (Rule vs ML)

Set in `server/.env` and restart the server:

```
DETECTOR_MODE=rule   # fixed thresholds (default) — instant, no warm-up
DETECTOR_MODE=ml     # online EWMA/z-score model — learns each profile's baseline live
```

Both implement the identical interface (`detect(reading) -> { anomaly, confidence, severity, reason }`), so `detector.js` is the only file that ever needs to know which one is active.

**Note:** ML mode needs ~20 ticks (~20 seconds) per profile to learn a baseline before it starts flagging anomalies — this is by design, not a bug. Rule mode has no warm-up.

---

## REST API

| Endpoint | Method | Query | Description |
|---|---|---|---|
| `/health` | GET | — | Liveness check |
| `/api/events` | GET | `limit` (default 50, max 200) | Returns persisted anomaly history, most recent first |

---

## Screenshots

> _Add screenshots here before submission — recommended shots:_
> 1. Full dashboard mid-stream (charts + metric cards live)
> 2. An anomaly firing — metric card turning red/amber + alert feed updating
> 3. AI Insight box mid-stream (partial text + blinking cursor)
> 4. Alert Feed with several severity levels visible
> 5. `DETECTOR_MODE=ml` vs `DETECTOR_MODE=rule` side-by-side (optional but strong for judges)

---

## Design Decisions

A few choices worth being ready to explain in Q&A:

- **Shared broadcast stream, not per-client generators.** One simulated feed is generated server-side and broadcast to every connected socket via `io.emit`. This guarantees every client sees an identical, consistent stream with no risk of desync between tabs/clients — directly satisfying the "concurrent connections without data loss" requirement without needing per-socket state.
- **True token streaming, not chunked buffering.** `geminiService.js` uses `generateContentStream` + `for await`, forwarding each chunk to the socket the instant it arrives — never awaiting the full response first.
- **Anomaly persisted before the AI insight resolves.** MongoDB gets the event row (`status: pending`) immediately on detection, then gets patched with the Gemini text once streaming completes. This means the Alert Feed history is never blocked on the LLM call.
- **Online ML over a pretrained model.** For Phase 9, an EWMA/z-score online learner was chosen over a pretrained/offline-trained model — no training data or export/import pipeline needed, it adapts to each simulated profile's baseline live, and it satisfies the "pluggable ML engine" interface the roadmap defines.

---

## Future Work

- **Manual anomaly trigger** — a "Trigger Test Anomaly" button/socket event for deterministic demos instead of waiting on random injection probability.
- **Context-aware detection** — evaluate heart rate against current accelerometer-derived activity level, instead of scoring each metric independently.
- **Rate-of-change detection** — flag rapid deterioration (e.g. SpO2 dropping fast) as higher severity than the same absolute value reached gradually.
- **True fall-pattern detection** — detect the free-fall → impact → stillness sequence across multiple ticks, instead of a single-tick accel threshold.
- **Composite risk score** — combine all three metrics' anomaly scores into one aggregated 0–100 risk indicator.
- **Multi-profile UI** — let the user pick between `normal` / `athlete` / `senior` / `stress` simulated profiles from the dashboard.
- **Auth + multi-user support** — currently a single shared simulated stream; per-user auth and personal history would be needed for a real product.

---

## Demo & Code Walkthrough

Two short recordings are expected per the roadmap's Definition of Done. Suggested outline for each:

**Demo video (2–3 min):**
1. Start both servers, show the dashboard connecting live.
2. Let it run until a real anomaly fires — show the metric card changing color, the AI Insight streaming token-by-token, and the Alert Feed updating.
3. Disconnect the backend briefly, show the "disconnected" banner, then reconnect and show the chart gap + history backfill.
4. (Optional) Switch `DETECTOR_MODE` to `ml`, restart, and show the same flow running on the ML engine.

**Code walkthrough video (5–8 min):**
1. Architecture diagram (this README) — narrate the data flow tick-by-tick.
2. `socketHandler.js` — the central orchestration point.
3. `geminiService.js` — call out `for await` + `onChunk` as the mechanism satisfying "no full-response buffering."
4. `detector.js` + `ruleBased.js`/`mlModel.js` — the pluggable interface.
5. `Event.js` / `mongoService.js` — the save-then-patch persistence pattern.
6. `Dashboard.jsx` — socket event wiring, reconnect backfill, error boundary.
