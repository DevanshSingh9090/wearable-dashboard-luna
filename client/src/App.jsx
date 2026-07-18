import { useState, useEffect } from 'react'
import { socket } from './services/socket'
import './App.css'

function App() {
  const [status, setStatus] = useState("connecting...")

  useEffect(() => {
    socket.on("connect", () => {
      console.log("connected:", socket.id)
      setStatus("connected: " + socket.id)
    })
    socket.on("server:ready", (data) => console.log("server says:", data))
    socket.on("disconnect", () => setStatus("disconnected"))

    return () => socket.disconnect()
  }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Wearable Dashboard</h1>
      <p>Socket status: {status}</p>
    </div>
  )
}

export default App