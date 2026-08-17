import CssSparkline from "./CssSparkline";
import ProvenanceBadge from "./ProvenanceBadge";

const TRAFFIC = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-400",
  grey: "bg-slate-500",
};

const SPARK_COLOR = {
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#fb7185",
  grey: "#64748b",
};

export default function MachineValueCards({ values = [] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#141820] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Aktuelle Maschinenwerte
          </h2>
          <p className="text-xs text-slate-500">
            Nur Kompaktanzeigen — Detailcharts beim Maschinen-Drilldown (Stage 2+)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {values.map((item) => {
          const locked = item.value === "—" || item.lockedHint;
          return (
            <div
              key={item.key}
              className="rounded-xl border border-white/10 bg-[#1a1f27] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-50">
                    {item.value}
                    {item.unit ? (
                      <span className="ml-1 text-sm font-normal text-slate-400">
                        {item.unit}
                      </span>
                    ) : null}
                  </p>
                </div>
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    TRAFFIC[item.traffic] || TRAFFIC.grey
                  }`}
                  title={`Ampel: ${item.traffic}`}
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                {!locked && item.spark?.length ? (
                  <CssSparkline
                    data={item.spark.slice(-50)}
                    color={SPARK_COLOR[item.traffic] || SPARK_COLOR.grey}
                  />
                ) : (
                  <p className="text-[11px] text-slate-500">
                    {item.lockedHint || "Kein Trend"}
                  </p>
                )}
                <ProvenanceBadge source={item.value_source} />
              </div>

              {!locked && item.normalMin != null ? (
                <p className="mt-2 text-[10px] text-slate-500">
                  Normal {item.normalMin}–{item.normalMax}
                  {item.deviation != null
                    ? ` · Abweichung ${item.deviation > 0 ? "+" : ""}${item.deviation}`
                    : ""}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
