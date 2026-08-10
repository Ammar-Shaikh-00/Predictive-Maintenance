/** Provenance chip — never hide SIMULATED / RULE_BASED as Accuracy. */
const STYLES = {
  LIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  RULE_BASED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  DERIVED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  SIMULATED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  MODEL_PREDICTION: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  MANUAL: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const LABELS = {
  LIVE: "LIVE",
  RULE_BASED: "Regelbasierte Warnung",
  DERIVED: "Abgeleitet",
  SIMULATED: "Demo / Simuliert",
  MODEL_PREDICTION: "Modellvorhersage",
  MANUAL: "Manuell",
};

/** Map English / legacy API labels → German UI. */
const LABEL_ALIASES = {
  "demo prediction": "Demo-Vorhersage",
  "demo / simulated": "Demo / Simuliert",
  simulated: "Demo / Simuliert",
  derived: "Abgeleitet",
  "rule-based warning": "Regelbasierte Warnung",
  "rule based warning": "Regelbasierte Warnung",
  "model prediction": "Modellvorhersage",
  manual: "Manuell",
  live: "LIVE",
};

function resolveLabel(source, label) {
  if (label) {
    const aliased = LABEL_ALIASES[String(label).trim().toLowerCase()];
    if (aliased) return aliased;
    return label;
  }
  return LABELS[source] || source || LABELS.SIMULATED;
}

export default function ProvenanceBadge({ source, label, className = "" }) {
  const key = source || "SIMULATED";
  const text = resolveLabel(key, label);
  const style = STYLES[key] || STYLES.SIMULATED;

  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${style} ${className}`}
    >
      <span className="truncate">{text}</span>
    </span>
  );
}
