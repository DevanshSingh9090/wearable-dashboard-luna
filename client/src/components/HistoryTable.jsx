function formatTime(ts) {
  return new Date(ts).toLocaleTimeString();
}

function HistoryTable({ events }) {
  return (
    <div className="history-table">
      <div className="history-table__title">Alert Feed</div>
      {events.length === 0 ? (
        <div className="history-table__empty">No anomalies detected yet.</div>
      ) : (
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
              <tr key={event.id} className={`severity-row severity-row--${event.severity}`}>
                <td>{formatTime(event.timestamp)}</td>
                <td className="severity-cell">{event.severity}</td>
                <td>{(event.confidence * 100).toFixed(0)}%</td>
                <td>{event.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default HistoryTable;