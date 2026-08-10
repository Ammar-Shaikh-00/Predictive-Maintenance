// CombinedChart.jsx

import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function CombinedChart({ data = [] }) {
  const { t } = useTranslation();

  const chartData = [...data]
    .reverse()
    .map((item) => ({
      time: new Date(item.window_end).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),

      screw_speed: item.avg_speed,
      pressure: item.avg_pressure,
      temperature: item.avg_temp,
      load: item.avg_load,
    }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-violet-700">
          {t("liveEstimated.chart.title")}
        </h2>
      </div>

      <div className="w-full h-[415px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              left: 0,
              bottom: 10,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />

            <XAxis
              dataKey="time"
              tick={{
                fontSize: 12,
                fill: "#64748b",
              }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              yAxisId="left"
              tick={{
                fontSize: 12,
                fill: "#64748b",
              }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{
                fontSize: 12,
                fill: "#64748b",
              }}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />

            <Legend
              wrapperStyle={{
                paddingBottom: 20,
                fontSize: 13,
              }}
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="screw_speed"
              name={t("liveEstimated.parameters.screwSpeedRpm")}
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="pressure"
              name={t("liveEstimated.parameters.pressureBar")}
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="temperature"
              name={t("liveEstimated.parameters.temperatureC")}
              stroke="#8b5cf6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="load"
              name={t("liveEstimated.parameters.loadPercent")}
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-sm text-slate-400">
        {t("liveEstimated.chart.footer")}
      </div>
    </div>
  );
}
