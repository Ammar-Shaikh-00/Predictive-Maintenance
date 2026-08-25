/** Provenance chip — never hide SIMULATED / RULE_BASED as Accuracy. */
import { useTranslation } from "react-i18next";

const STYLES = {
  LIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  RULE_BASED: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  DERIVED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  SIMULATED: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  MODEL_PREDICTION: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  AI_SERVICE: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  MANUAL: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

/** Map raw backend label strings → i18n key suffix (or null to use source key). */
const ALIAS_TO_KEY = {
  "demo prediction": "SIMULATED",
  "demo / simulated": "SIMULATED",
  simulated: "SIMULATED",
  derived: "DERIVED",
  "rule-based warning": "RULE_BASED",
  "rule based warning": "RULE_BASED",
  "regelbasierte auswertung": "RULE_BASED",
  "regelbasierte warnung": "RULE_BASED",
  "model prediction": "MODEL_PREDICTION",
  modellvorhersage: "MODEL_PREDICTION",
  "ai/ml-dienst": "MODEL_PREDICTION",
  manual: "MANUAL",
  manuell: "MANUAL",
  live: "LIVE",
  abgeleitet: "DERIVED",
};

export default function ProvenanceBadge({ source, label, className = "" }) {
  const { t } = useTranslation();
  const key = source || "LIVE";

  // Try to resolve the label string to a known i18n key first
  const aliasKey = label
    ? ALIAS_TO_KEY[String(label).trim().toLowerCase()]
    : null;
  const resolvedKey = aliasKey || key;

  // Prefer i18n translation; fall back to the original label or source key
  const text = t(`provenance.${resolvedKey}`, {
    defaultValue: label || resolvedKey,
  });

  const style = STYLES[key] || STYLES[resolvedKey] || STYLES.LIVE;

  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${style} ${className}`}
    >
      <span className="truncate">{text}</span>
    </span>
  );
}
