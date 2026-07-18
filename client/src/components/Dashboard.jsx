import { useState, useEffect } from "react";
import { socket } from "../services/socket";
import ConnectionStatus from "./ConnectionStatus";
import MetricCard from "./MetricCard";
import LiveChart from "./LiveChart";
import HistoryTable from "./HistoryTable";

const CHART_WINDOW = 60; // keep last 60 ticks (~1 min at 1 reading/sec)
const HISTORY_LIMIT = 50; // cap in-memory alert feed until Phase 7 adds Mongo

function Dashboard() {
  const [status, setStatus] = useState("connecting...");
  const [chartData, setChartData] = useState([]);
  const [latest, setLatest] = useState(null);
  const [lastAnomaly, setLastAnomaly] = useState(null); // used to flash the matching MetricCard
  const [events, setEvents] = useState([]);

  useEffect(() => {
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
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("sensor:data", onSensorData);
    socket.on("anomaly:detected", onAnomalyDetected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("sensor:data", onSensorData);
      socket.off("anomaly:detected", onAnomalyDetected);
    };
  }, []);

  // Determine which metric (if any) the most recent anomaly hit, so its
  // card can highlight. Only treat it as "current" for a short window so
  // an old anomaly doesn't leave a card stuck red forever.
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

      <section className="dashboard__history">
        <HistoryTable events={events} />
      </section>
    </div>
  );
}

export default Dashboard;