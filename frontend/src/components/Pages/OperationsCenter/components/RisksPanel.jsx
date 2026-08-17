import ProvenanceBadge from "./ProvenanceBadge";

export default function RisksPanel({ risks = [] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#141820] p-4 sm:p-5 h-full">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
        Erwartete Risiken
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Klartext — Stage 1 verwendet nur Demo-Vorhersagen
      </p>
      <ul className="mt-3 space-y-3">
        {risks.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2.5"
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <ProvenanceBadge source={r.value_source} label={r.display_label} />
              {r.is_customer_decision_relevant === false ? (
                <span className="text-[10px] text-slate-500">
                  Noch nicht entscheidungsrelevant
                </span>
              ) : null}
            </div>
            <p className="text-sm text-slate-200">{r.text}</p>
          </li>
        ))}
        {risks.length === 0 ? (
          <li className="text-sm text-slate-500">Keine erwarteten Risiken</li>
        ) : null}
      </ul>
    </section>
  );
}
