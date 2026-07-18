import { useState, useEffect } from "react";
import { socket } from "../services/socket";
import ConnectionStatus from "./ConnectionStatus";
import MetricCard from "./MetricCard";
import LiveChart from "./LiveChart";
import HistoryTable from "./HistoryTable";
import AIInsight from "./AIInsight";
import { fetchEventHistory } from "../services/api";

const CHART_WINDOW = 60;
const HISTORY_LIMIT = 50;

function Dashboard() {
  const [status, setStatus] = useState("connecting...");
  const [chartData, setChartData] = useState([]);
  const [latest, setLatest] = useState(null);
  const [lastAnomaly, setLastAnomaly] = useState(null);
  const [events, setEvents] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [insight, setInsight] = useState(null);

  useEffect(() => {
    fetchEventHistory(HISTORY_LIMIT)
      .then((history) => {
        setEvents(
          history.map((doc) => ({
            id: doc.insightId || doc._id,
            timestamp: doc.timestamp,
            severity: doc.severity,
            confidence: doc.confidence,
            reason: doc.reason,
          }))
        );
      })
      .catch((err) => {
        console.error("[history] failed to load persisted events:", err.message);
        setHistoryError("Couldn't load past alerts — showing live data only.");
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    if (socket.connected) {
      setStatus("connected: " + socket.id);
    }

    function onConnect() {
      setStatus("connected: " + socket.id);
    }
    function onDisconnect() {
      setStatus("disconnected");
    }
    function onSensorData(reading) {
      setLatest(reading);
      setChartData((prev) => {
        const next = [
          ...prev,
          {
            time: new Date(reading.timestamp).toLocaleTimeString(),
            heartRate: reading.heartRate,
            spo2: reading.spo2,
            accelMag: reading.accelMag,
          },
        ];
        return next.length > CHART_WINDOW ? next.slice(next.length - CHART_WINDOW) : next;
      });
    }
    function onAnomalyDetected(payload) {
      setLastAnomaly(payload);
      setEvents((prev) => {
        const next = [{ ...payload, id: `${payload.timestamp}-${Math.random()}` }, ...prev];
        return next.length > HISTORY_LIMIT ? next.slice(0, HISTORY_LIMIT) : next;
      });
      setInsight({ id: payload.insightId, text: "", status: "streaming" });
    }
    function onAiChunk({ insightId, chunk }) {
      setInsight((prev) => (prev && prev.id === insightId ? { ...prev, text: prev.text + chunk } : prev));
    }
    function onAiDone({ insightId }) {
      setInsight((prev) => (prev && prev.id === insightId ? { ...prev, status: "done" } : prev));
    }
    function onAiError({ insightId, message }) {
      setInsight((prev) => (prev && prev.id === insightId ? { ...prev, status: "error", error: message } : prev));
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("sensor:data", onSensorData);
    socket.on("anomaly:detected", onAnomalyDetected);
    socket.on("ai:chunk", onAiChunk);
    socket.on("ai:done", onAiDone);
    socket.on("ai:error", onAiError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("sensor:data", onSensorData);
      socket.off("anomaly:detected", onAnomalyDetected);
      socket.off("ai:chunk", onAiChunk);
      socket.off("ai:done", onAiDone);
      socket.off("ai:error", onAiError);
    };
  }, []);

  const anomalyIsFresh = lastAnomaly && Date.now() - lastAnomaly.timestamp < 5000;
  const anomalyReason = anomalyIsFresh ? lastAnomaly.reason : "";
  const hrSeverity = anomalyIsFresh && anomalyReason.includes("Heart rate") ? lastAnomaly.severity : "none";
  const spo2Severity = anomalyIsFresh && anomalyReason.includes("SpO2") ? lastAnomaly.severity : "none";
  const accelSeverity =
    anomalyIsFresh && (anomalyReason.includes("fall") || anomalyReason.includes("movement"))
      ? lastAnomaly.severity
      : "none";

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1>Wearable Intelligence Dashboard</h1>
        <ConnectionStatus status={status} />
      </header>

      {status === "disconnected" && (
        <div className="banner banner--warning">
          Lost connection to the server — trying to reconnect… Live updates are paused.
        </div>
      )}

      <section className="dashboard__cards">
        <MetricCard label="Heart Rate" value={latest?.heartRate} unit=" bpm" severity={hrSeverity} />
        <MetricCard label="SpO2" value={latest?.spo2} unit=" %" severity={spo2Severity} />
        <MetricCard label="Accel Mag" value={latest?.accelMag} unit=" g" severity={accelSeverity} />
      </section>

      <section className="dashboard__charts">
        <LiveChart title="Heart Rate" data={chartData} dataKey="heartRate" color="#ff6584" unit="bpm" />
        <LiveChart title="SpO2" data={chartData} dataKey="spo2" color="#4dd0e1" unit="%" domain={[80, 100]} />
        <LiveChart title="Accel Magnitude" data={chartData} dataKey="accelMag" color="#ffb74d" unit="g" />
      </section>

      <section className="dashboard__insight">
        <AIInsight insight={insight} />
      </section>

      <section className="dashboard__history">
        <HistoryTable events={events} loading={historyLoading} error={historyError} />
      </section>
    </div>
  );
}

export default Dashboard;