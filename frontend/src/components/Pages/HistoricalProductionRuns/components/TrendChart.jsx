import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function TrendChart({ runs }) {

  const data = runs.map((r, index) => ({
    name: `#${r.id}`,
    value: index + 1,
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">

      <h2 className="text-xl font-bold mb-5">
        Trends
      </h2>

      <div className="h-[300px]">

        <ResponsiveContainer width="100%" height="100%">

          <LineChart data={data}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="name" />

            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="value"
              stroke="#7c3aed"
              strokeWidth={3}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}