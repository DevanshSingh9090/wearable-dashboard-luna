import axios from "axios";

const API_BASE = "http://localhost:5000/api";

export async function fetchEventHistory(limit = 50) {
  const res = await axios.get(`${API_BASE}/events`, { params: { limit } });
  return res.data.events;
}