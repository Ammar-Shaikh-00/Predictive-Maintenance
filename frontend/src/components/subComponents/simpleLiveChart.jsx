import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

const SimpleLiveChart = ({
  title,
  legend,
  data = [],
  unit,
  lineColor = "#10b981",
  height = 300,
  yDomain: yDomainProp,
  yTicks,
  yTickFormatter,
  tooltipValueFormatter,
  timeFormat = "datetime",
  bands,
}) => {
  const chartData = useMemo(() => {
    const AUSTRIA_OFFSET_MS = (3 * 60 + 14) * 60 * 1000;
    const VIENNA_TZ = "Europe/Vienna";

    const parseTs = (timestamp) => {
      if (typeof timestamp !== "string") return timestamp;
      let iso = String(timestamp).trim();
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(iso)) {
        iso += "Z";
      }
      return new Date(iso);
    };

    const raw = data.map((d) => {
      const ts = parseTs(d.timestamp);
      const valid = !Number.isNaN(ts.getTime());

      const displayTs = valid
        ? new Date(ts.getTime() - AUSTRIA_OFFSET_MS)
        : new Date(NaN);

      const datePart = valid
        ? ts.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            timeZone: VIENNA_TZ,
          })
        : "–";

      const timePart = valid
        ? displayTs.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: VIENNA_TZ,
          })
        : "–";

      return {
        ...d,
        __ts: ts,
        __displayTs: displayTs,
        __datePart: datePart,
        __timePart: timePart,
      };
    });

    if (timeFormat === "time") {
      return raw.map((d) => ({
        ...d,
        timeLabel: d.__timePart,
      }));
    }

    const sorted = [...raw].sort(
      (a, b) => a.__ts.getTime() - b.__ts.getTime()
    );

    const seenDates = new Set();

    return sorted.map((d) => {
      let label = "";
      if (!seenDates.has(d.__datePart)) {
        seenDates.add(d.__datePart);
        label = d.__datePart;
      }

      return {
        ...d,
        timeLabel: label,
      };
    });
  }, [data, timeFormat]);

  const yDomain = useMemo(() => {
    if (yDomainProp && yDomainProp.length === 2) return yDomainProp;

    const values = chartData
      .map((d) => Number(d.value))
      .filter((v) => !isNaN(v));

    if (values.length === 0) return [0, 100];

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    const minRange = Math.max(mean * 0.02, 1, range * 1.1);
    const half = minRange / 2;

    if (range < minRange * 0.5) {
      return [mean - half, mean + half];
    }

    const padding = range * 0.05 || 1;
    return [minVal - padding, maxVal + padding];
  }, [chartData, yDomainProp]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow min-w-0 overflow-hidden">
      <div className="mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        {legend && <p className="text-xs text-gray-500">{legend}</p>}
      </div>

      <div className="w-full min-w-0" style={{ height, minHeight: height }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={height} minWidth={0}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 35 }}
            >
            <CartesianGrid strokeDasharray="3 3" />

            {/* Bands */}
            {bands &&
              bands.map((band, idx) => {
                const [yMin, yMax] = yDomain;
                if (band.to < yMin || band.from > yMax) return null;

                return (
                  <ReferenceArea
                    key={idx}
                    y1={Math.max(band.from, yMin)}
                    y2={Math.min(band.to, yMax)}
                    stroke="none"
                    fill={band.color}
                    fillOpacity={band.opacity ?? 0.15}
                  />
                );
              })}

            <XAxis
              dataKey="timeLabel"
              tick={{ fontSize: 11, angle: -35, textAnchor: "end" }}
              height={60}
              interval={timeFormat === "datetime" ? 0 : "preserveStartEnd"}
            />

            <YAxis
              domain={yDomain}
              ticks={yTicks}
              tick={{ fontSize: 11 }}
              tickFormatter={
                yTickFormatter || ((value) => Number(value).toFixed(0))
              }
            />

            <Tooltip
              formatter={(value) => [
                tooltipValueFormatter
                  ? tooltipValueFormatter(value)
                  : `${Number(value).toFixed(2)} ${unit}`,
                title,
              ]}
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              animationDuration={700}
            />
          </LineChart>
        </ResponsiveContainer>
        ) : (
          <div
            className="flex items-center justify-center text-sm text-slate-400"
            style={{ height }}
          >
            —
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleLiveChart;