import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function LiveChart({ title, data, dataKey, color, unit, domain }) {
  return (
    <div className="live-chart">
      <div className="live-chart__title">{title}</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#888" }} minTickGap={30} />
          <YAxis domain={domain || ["auto", "auto"]} tick={{ fontSize: 10, fill: "#888" }} width={40} />
          <Tooltip
            contentStyle={{ background: "#1a1a22", border: "1px solid #333", fontSize: 12 }}
            labelStyle={{ color: "#aaa" }}
            formatter={(value) => [`${value} ${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LiveChart;