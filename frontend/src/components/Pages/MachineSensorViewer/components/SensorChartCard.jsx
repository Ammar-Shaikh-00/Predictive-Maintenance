import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTranslation } from "react-i18next";

export default function SensorChartCard({
  title,
  data,
}) {
  const { t } = useTranslation();

  /* FORMAT TIME */
  const formatTime = (value) => {

    if (!value) return "";

    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">

      {/* TITLE */}
      <div className="flex items-center justify-between mb-4">

        <h3 className="font-semibold text-slate-700">
          {title}
        </h3>

        <div className="text-xs text-slate-400">
          {t("machineSensorViewer.chart.liveTrend")}
        </div>

      </div>

      {/* CHART */}
      <div className="h-[260px]">

        <ResponsiveContainer width="100%" height="100%">

          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 15,
              left: 0,
              bottom: 10,
            }}
          >

            {/* GRID */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />

            {/* X AXIS */}
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              tick={{
                fontSize: 11,
                fill: "#64748b",
              }}
              axisLine={{
                stroke: "#cbd5e1",
              }}
              tickLine={{
                stroke: "#cbd5e1",
              }}
              minTickGap={25}
            />

            {/* Y AXIS */}
            <YAxis
                tick={{
                    fontSize: 11,
                    fill: "#64748b",
                }}
                axisLine={{
                    stroke: "#cbd5e1",
                }}
                tickLine={{
                    stroke: "#cbd5e1",
                }}
                width={45}
                tickCount={12}
                domain={[
                    (dataMin) => dataMin * 0.995,
                    (dataMax) => dataMax * 1.005,
                ]}
            />

            {/* TOOLTIP */}
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow:
                  "0 4px 14px rgba(0,0,0,0.08)",
              }}
              labelFormatter={(label) =>
                new Date(label).toLocaleString()
              }
            />

            {/* LINE */}
            <Line
              type="basis"
              dataKey="value"
              stroke="#7c3aed"
              dot={false}
              strokeWidth={2.5}
              activeDot={{
                r: 5,
                stroke: "#7c3aed",
                strokeWidth: 2,
                fill: "#ffffff",
              }}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}