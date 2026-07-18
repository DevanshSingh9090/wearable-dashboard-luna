function formatTime(ts) {
  return new Date(ts).toLocaleTimeString();
}

function HistoryTable({ events, loading = false, error = null }) {
  return (
    <div className="history-table">
      <div className="history-table__title">Alert Feed</div>

      {error && <div className="history-table__banner">{error}</div>}

      {loading ? (
        <div className="history-table__empty">Loading past alerts…</div>
      ) : events.length === 0 ? (
        <div className="history-table__empty">No anomalies detected yet.</div>
      ) : (
        <div className="history-table__scroll">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td data-label="Time">{formatTime(event.timestamp)}</td>
                  <td data-label="Severity">
                    <span className={`severity-badge severity-badge--${event.severity}`}>{event.severity}</span>
                  </td>
                  <td data-label="Confidence">{(event.confidence * 100).toFixed(0)}%</td>
                  <td data-label="Reason">{event.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default HistoryTable;