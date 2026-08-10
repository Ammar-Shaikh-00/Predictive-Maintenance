/**
 * PDF Produktionslauf card — bottom sticky, rounded panel like other OC cards.
 */
export default function CurrentRunBar({ run = null, dataCurrent = null }) {
  const order = displayText(run?.order_label) || (run?.id != null ? `#${run.id}` : "—");
  const line = displayText(run?.line_label);
  const orderText = line ? `${order} | ${line}` : order;
  const produced = formatKg(run?.produced);
  const scrap = formatPct(run?.scrap);
  const oee = formatPct(run?.oee);

  return (
    <div className="oc-run-bar sticky bottom-0 z-20 mt-4 w-full min-w-0 px-0 pb-1 pt-1 sm:pb-2">
      <div className="oc-run-card w-full min-w-0">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-6">
          <Metric
            label="Produktionslauf"
            value={orderText}
            labelTone="text-emerald-400"
          />
          <Metric label="Laufzeit" value={displayText(run?.runtime) || "—"} />
          <Metric label="Produziert" value={produced} />
          <Metric
            label="Ausschuss"
            value={scrap}
            labelTone="text-rose-400"
          />
          <Metric
            label="OEE"
            value={oee}
            valueTone={oee !== "—" ? "text-emerald-400" : undefined}
          />
          <div className="inline-flex min-w-0 items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Daten aktuell
            </span>
            <span className="font-semibold tabular-nums text-slate-100">
              {dataCurrent
                ? dataCurrent.toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "—"}
            </span>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, labelTone, valueTone }) {
  return (
    <div className="inline-flex min-w-0 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2">
      <span
        className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
          labelTone || "text-slate-500"
        }`}
      >
        {label}
      </span>
      <span
        className={`truncate font-semibold tabular-nums ${valueTone || "text-slate-100"}`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function displayText(v) {
  if (v == null || v === "") return null;
  if (typeof v === "object") return null;
  return String(v);
}

function formatKg(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("de-DE")} kg`;
}

function formatPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n}%`;
}
