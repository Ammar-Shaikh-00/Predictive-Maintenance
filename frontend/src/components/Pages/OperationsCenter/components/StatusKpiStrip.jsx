const STATUS_STYLES = {
  PRODUCTION: "text-emerald-300 bg-emerald-500/15 border-emerald-500/40",
  READY: "text-sky-300 bg-sky-500/15 border-sky-500/40",
  HEATING: "text-amber-300 bg-amber-500/15 border-amber-500/40",
  COOLING: "text-cyan-300 bg-cyan-500/15 border-cyan-500/40",
  FAULT: "text-rose-300 bg-rose-500/15 border-rose-500/40",
  STOPPED: "text-slate-300 bg-slate-500/15 border-slate-500/40",
};

const STATUS_LABELS = {
  PRODUCTION: "Production running",
  READY: "Ready",
  HEATING: "Line is heating up",
  COOLING: "Cooling down",
  FAULT: "Fault",
  STOPPED: "Production stopped",
};

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1f27] px-4 py-3 min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold text-slate-50">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function StatusKpiStrip({
  plantStatus,
  connectedMachines,
  totalMachines,
  digitalizationProgress,
  predictionReadiness,
  dataQuality,
  activeWarnings,
  activeRisks,
}) {
  const statusClass = STATUS_STYLES[plantStatus] || STATUS_STYLES.STOPPED;
  const statusLabel = STATUS_LABELS[plantStatus] || plantStatus;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${statusClass}`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {statusLabel}
        </span>
        <span className="text-xs text-slate-500">
          Status updates every 10–30s · Stage 1 demo config
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Connected machines"
          value={`${connectedMachines} of ${totalMachines}`}
          hint="1 extruder live footprint"
        />
        <Kpi
          label="Digitalization"
          value={`${digitalizationProgress}%`}
          hint="Infrastructure + sources"
        />
        <Kpi
          label="Prediction Readiness"
          value={`${predictionReadiness}%`}
          hint="Not Accuracy"
        />
        <Kpi
          label="Data quality"
          value={`${dataQuality}%`}
          hint="Completeness / freshness"
        />
        <Kpi label="Active warnings" value={activeWarnings} />
        <Kpi label="Expected risks" value={activeRisks} hint="Demo predictions" />
      </div>
    </section>
  );
}
