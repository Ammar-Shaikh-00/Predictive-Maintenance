import { useEffect, useState } from "react";
import safeApi from "../../../../api/safeApi";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "#22c55e", // good
  "#f59e0b", // warning
  "#ef4444", // critical
];

export default function ScrapDistribution() {

  const [distribution, setDistribution] = useState(null);

  const fetchDistribution = async () => {
    try {

      const res = await safeApi.get(
        "/historical-run/scrap-distribution?days=30"
      );

      setDistribution(res.data);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDistribution();
  }, []);

  /* LOADING */
  if (!distribution) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-[420px] animate-pulse" />
    );
  }

  const total =
    (distribution.good_scrap_runs || 0) +
    (distribution.warning_scrap_runs || 0) +
    (distribution.critical_scrap_runs || 0);

  const data = [
    {
      name: "Good (0 - 25%)",
      value: distribution.good_scrap_runs || 0,
      color: COLORS[0],
    },

    {
      name: "Warning (25 - 50%)",
      value: distribution.warning_scrap_runs || 0,
      color: COLORS[1],
    },

    {
      name: "Critical (>50%)",
      value: distribution.critical_scrap_runs || 0,
      color: COLORS[2],
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">

      {/* HEADER */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          Scrap % Distribution
        </h2>
      </div>

      {/* CONTENT */}
      <div className="flex items-center justify-between gap-4">

        {/* CHART */}
        <div className="relative w-[220px] h-[220px]">

          <ResponsiveContainer width="100%" height="100%">

            <PieChart>

              <Pie
                data={data}
                dataKey="value"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={2}
                stroke="none"
              >

                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.color}
                  />
                ))}

              </Pie>

            </PieChart>

          </ResponsiveContainer>

          {/* CENTER */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">

            <div className="text-4xl font-bold text-slate-800">
              {total}
            </div>

            <div className="text-sm text-slate-500 mt-1">
              Runs
            </div>

          </div>

        </div>

        {/* LEGEND */}
        <div className="flex-1 space-y-5">

          {data.map((item, index) => {

            const percentage =
              total > 0
                ? ((item.value / total) * 100).toFixed(0)
                : 0;

            return (
              <div
                key={index}
                className="flex items-center justify-between gap-4"
              >

                <div className="flex items-center gap-3">

                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />

                  <div className="text-sm text-slate-600">
                    {item.name}
                  </div>

                </div>

                <div className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                  {item.value} ({percentage}%)
                </div>

              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
}