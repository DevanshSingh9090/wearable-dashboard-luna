function MetricCard({ label, value, unit, severity }) {
  const cardClass =
    severity === "high"
      ? "metric-card metric-card--high"
      : severity === "medium"
      ? "metric-card metric-card--medium"
      : "metric-card";

  return (
    <div className={cardClass}>
      <div className="metric-card__label">{label}</div>
      <div className="metric-card__value">
        {value ?? "--"}
        <span className="metric-card__unit">{unit}</span>
      </div>
    </div>
  );
}

export default MetricCard;