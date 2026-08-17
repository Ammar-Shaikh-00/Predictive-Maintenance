function Bar({ label, value, hint }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="tabular-nums text-slate-400">{clamped}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-teal-400/90 transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {hint ? <p className="mt-1 text-[10px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

/**
 * Vorhersagebereitschaft — niemals als Genauigkeit in Stage 1 bezeichnen.
 */
export default function PredictionReadiness({
  readiness,
  potentials = {},
  coverageBars = [],
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#141820] p-4 sm:p-5 h-full">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
        Vorhersagebereitschaft
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Grundlage fürs Lernen — keine validierte Modellgenauigkeit
      </p>

      <div className="mt-4 flex items-end gap-2">
        <p className="text-3xl font-semibold text-slate-50">{readiness}%</p>
        <p className="pb-1 text-xs text-teal-400/90">KI-Bereitschaft</p>
      </div>

      <div className="mt-4 space-y-3">
        {coverageBars.map((bar) => (
          <Bar
            key={bar.key}
            label={bar.label}
            value={bar.value}
            hint="Diese Daten verbessern die Vorhersagequalität"
          />
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-white/5 bg-black/20 p-3 space-y-1.5">
        <p className="text-[11px] uppercase tracking-wider text-slate-500">
          Geschätztes Potenzial
        </p>
        <p className="text-xs text-slate-300">
          Nach Qualitätsdaten:{" "}
          <span className="font-semibold text-slate-100">
            {potentials.after_quality ?? "—"}%
          </span>
        </p>
        <p className="text-xs text-slate-300">
          Nach Wartungsdaten:{" "}
          <span className="font-semibold text-slate-100">
            {potentials.after_maintenance ?? "—"}%
          </span>
        </p>
        <p className="text-xs text-slate-300">
          Nach allen Maschinen:{" "}
          <span className="font-semibold text-slate-100">
            {potentials.after_all_machines ?? "—"}%
          </span>
        </p>
      </div>
    </section>
  );
}
