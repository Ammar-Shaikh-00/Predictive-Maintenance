import { Line, LineChart, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";

const getChartColor = (color = "") => {
  if (color.includes("violet")) return "#8b5cf6";
  if (color.includes("amber")) return "#d97706";
  if (color.includes("sky")) return "#0284c7";
  if (color.includes("pink")) return "#db2777";
  return "#14b8a6";
};

const MiniSparkline = ({ data = [], color = "#14b8a6" }) => (
  <div className="h-9 w-full">
    <ResponsiveContainer width="100%" height="100%">
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
  </div>
);

const MetricCard = ({ title, value, delta, range, icon, color, trendData, t }) => (
  <div className="border-r border-slate-200 px-4 py-2 last:border-r-0">
    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
      <span className={`${color}`}>{icon}</span>
      {title}
    </div>
    <div className="flex items-end justify-between gap-3">
      <div className="text-2xl font-bold text-slate-950">{value}</div>
      <div className="text-sm font-semibold text-emerald-600">{delta}</div>
    </div>
    <MiniSparkline data={trendData} color={getChartColor(color)} />
    <div className="text-xs text-slate-500">
      {t("productionRun.process.targetRange")}: {range}
    </div>
  </div>
);

export default function ProcessMetrics({ metrics }) {
  const { t } = useTranslation();

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">{t("productionRun.process.title")}</h2>
      <div className="mt-4 grid gap-y-4 md:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} t={t} />
        ))}
      </div>
    </section>
  );
}
