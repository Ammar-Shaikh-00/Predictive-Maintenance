import { ResponsiveContainer ,LineChart, Line } from "recharts";

export default function Sparkline({ data, color = "#22c55e" }) {
  return (
    <ResponsiveContainer width="100%" height="40">
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}