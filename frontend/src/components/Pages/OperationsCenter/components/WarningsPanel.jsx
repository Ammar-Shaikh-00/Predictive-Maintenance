import ProvenanceBadge from "./ProvenanceBadge";

export default function WarningsPanel({ warnings = [] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#141820] p-4 sm:p-5 h-full">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
        Aktuelle Warnungen
      </h2>
      <ul className="mt-3 space-y-3">
        {warnings.map((w) => (
          <li
            key={w.id}
            className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5"
          >
            <div className="mb-1.5">
              <ProvenanceBadge source={w.value_source} label={w.display_label} />
            </div>
            <p className="text-sm text-slate-200">{w.text}</p>
          </li>
        ))}
        {warnings.length === 0 ? (
          <li className="text-sm text-slate-500">Keine aktiven Warnungen</li>
        ) : null}
      </ul>
    </section>
  );
}
