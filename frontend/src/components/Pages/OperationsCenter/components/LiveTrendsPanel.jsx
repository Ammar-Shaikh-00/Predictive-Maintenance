import { Link } from "react-router-dom";
import CssSparkline from "./CssSparkline";
import { localizeUiText } from "../buildOcCockpit";

const SPARK = {
  green: "#94a3b8",
  yellow: "#94a3b8",
  red: "#94a3b8",
  grey: "#64748b",
};

const DOT = {
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#fb7185",
  grey: "#64748b",
};

const LABEL_DE = {
  motor_load: "MOTORLAST",
  screw_speed: "SCHNECKENDREHZAHL",
  melt_pressure: "EXTRUDERDRUCK",
  temp_avg: "SCHMELZTEMPERATUR",
  zone3_temp: "ZONE-3-TEMPERATUR",
  energy: "ENERGIEVERBRAUCH",
  throughput: "MATERIALDURCHSATZ",
  scrap: "AUSSCHUSSQUOTE",
};

const SUB_DE = {
  temp_avg: "Durchschnitt",
  zone3_temp: "Durchschnitt",
};

const UNIT_DE = {
  rpm: "U/min",
  amp: "A",
  A: "A",
  "U/min": "U/min",
};

const TREND_ORDER = [
  "temp_avg",
  "melt_pressure",
  "screw_speed",
  "energy",
  "throughput",
  "scrap",
];

/**
 * PDF "LIVE TRENDS — LETZTE 60 MINUTEN"
 * Stacked on phone; 2-col from md when there's room; full 2×3 beside left stack on lg+.
 */
export default function LiveTrendsPanel({ values = [] }) {
  const byKey = Object.fromEntries((values || []).map((v) => [v.key, v]));
  const ordered = TREND_ORDER.map((key) => {
    if (byKey[key]) return byKey[key];
    return {
      key,
      label: LABEL_DE[key] || key,
      value: "—",
      unit: "",
      traffic: "grey",
      lockedHint: "Quelle noch nicht verbunden",
      spark: [],
    };
  });
  for (const v of values) {
    if (!TREND_ORDER.includes(v.key)) ordered.push(v);
  }

  return (
    <section className="oc-panel flex h-full min-h-0 min-w-0 flex-col lg:min-h-full">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="oc-section-title min-w-0">Live-Trends — Letzte 60 Minuten</h2>
        <Link to="/extruder-latest-values" className="oc-pill-btn shrink-0">
          Alle Trends anzeigen →
        </Link>
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-1 content-stretch gap-3 md:grid-cols-2">
        {ordered.slice(0, 6).map((item) => {
          const title =
            LABEL_DE[item.key] ||
            String(item.label || item.key || "").toUpperCase();
          const sub = SUB_DE[item.key] || "Aktuell";
          const spark = Array.isArray(item.spark) ? item.spark.slice(-40) : [];
          const last = spark.length ? spark[spark.length - 1] : null;
          const showSpark = spark.length > 0;
          const showValueLocked = item.value === "—" && !showSpark;
          const unit = UNIT_DE[item.unit] || item.unit || "";
          const lockedHint = item.lockedHint
            ? localizeUiText(item.lockedHint)
            : "Kein Trend";

          return (
            <div
              key={item.key}
              className="oc-trend-card flex min-w-0 flex-col justify-between overflow-hidden"
            >
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {title}{" "}
                <span className="font-normal normal-case tracking-normal text-slate-500">
                  {sub}
                </span>
              </p>
              <div className="mt-3 flex min-w-0 flex-col items-stretch gap-2 min-[1025px]:flex-row min-[1025px]:items-end min-[1025px]:justify-between">
                <p className="min-w-0 truncate text-2xl font-semibold tabular-nums text-white">
                  {item.value}
                  {unit ? (
                    <span className="ml-1 text-sm font-normal text-slate-400">
                      {unit}
                    </span>
                  ) : null}
                </p>
                {showSpark ? (
                  <div className="relative w-full max-w-full overflow-hidden min-[1025px]:max-w-[45%] min-[1025px]:shrink-0">
                    <CssSparkline
                      data={spark}
                      color={SPARK[item.traffic] || SPARK.grey}
                      width={220}
                      height={36}
                      className="w-full"
                    />
                    {last != null ? (
                      <span
                        className="absolute bottom-1 right-0 h-2 w-2 rounded-full ring-2 ring-[#1a1f27]"
                        style={{ background: DOT[item.traffic] || DOT.green }}
                      />
                    ) : null}
                  </div>
                ) : showValueLocked ? (
                  <p className="text-[10px] leading-snug text-slate-500 min-[1025px]:max-w-[40%] min-[1025px]:shrink-0 min-[1025px]:text-right">
                    {lockedHint}
                  </p>
                ) : null}
              </div>
              <Link to="/machine" className="oc-pill-btn oc-pill-btn--sm mt-3">
                Details anzeigen →
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
