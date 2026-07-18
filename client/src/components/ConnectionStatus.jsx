function ConnectionStatus({ status }) {
  const isConnected = status.startsWith("connected");

  return (
    <div className="connection-status">
      <span className={`status-dot ${isConnected ? "status-dot--live" : "status-dot--down"}`} />
      <span>{isConnected ? "Connected" : "Disconnected"}</span>
    </div>
  );
}

export default ConnectionStatus;