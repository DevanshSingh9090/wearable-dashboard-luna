function AIInsight({ insight }) {
  if (!insight) {
    return (
      <div className="ai-insight">
        <div className="ai-insight__title">AI Insight</div>
        <div className="ai-insight__empty">Waiting for an anomaly to trigger an insight…</div>
      </div>
    );
  }

  return (
    <div className="ai-insight">
      <div className="ai-insight__title">
        AI Insight
        {insight.status === "streaming" && <span className="ai-insight__pulse" />}
      </div>
      <p className="ai-insight__text">
        {insight.text}
        {insight.status === "streaming" && <span className="ai-insight__cursor">▍</span>}
      </p>
      {insight.status === "error" && (
        <div className="ai-insight__error">Couldn't generate insight: {insight.error}</div>
      )}
    </div>
  );
}

export default AIInsight;