import { sourceLabel } from "../../../../utils/capabilityEngine";

function ProgressBar({ value }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export default function DigitalizationProgress({
  progress,
  checklistDone = [],
  checklistOpen = [],
  connectedSources = [],
}) {
  const openRemaining = checklistOpen.filter(
    (item) => !connectedSources.includes(item.key)
  );
  const newlyDone = checklistOpen.filter((item) =>
    connectedSources.includes(item.key)
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-[#141820] p-4 sm:p-5 h-full">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
        Digitalization progress
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        How much infrastructure and how many data sources are already connected — not model accuracy
      </p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold text-slate-50">{progress}%</p>
        <p className="text-xs text-slate-500 pb-1">Digitalization completed</p>
      </div>
      <div className="mt-2">
        <ProgressBar value={progress} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wider text-emerald-400/90">
            Already completed
          </p>
          <ul className="space-y-1.5">
            {[...checklistDone, ...newlyDone].map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-sm text-slate-200">
                <span className="text-emerald-400">✓</span>
                {item.label || sourceLabel(item.key)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">
            Still open
          </p>
          <ul className="space-y-1.5">
            {openRemaining.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-sm text-slate-400">
                <span className="text-slate-600">□</span>
                {item.label || sourceLabel(item.key)}
              </li>
            ))}
            {openRemaining.length === 0 ? (
              <li className="text-sm text-emerald-400">All listed sources connected</li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
