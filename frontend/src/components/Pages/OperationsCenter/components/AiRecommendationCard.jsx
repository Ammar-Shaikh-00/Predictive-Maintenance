import { Link } from "react-router-dom";
import ProvenanceBadge from "./ProvenanceBadge";

const STATUS_TONE = {
  CRITICAL: "text-rose-300 border-rose-500/40 bg-rose-950/40",
  WARNING: "text-amber-300 border-amber-500/40 bg-amber-950/40",
  NORMAL: "text-emerald-300 border-emerald-500/40 bg-emerald-950/30",
};

/**
 * Module 7 — Live AI analysis from latest live_run_evaluation.
 * Structured: state, overall_status, anomaly, drift, stability, regime,
 * explanation_text, Recommended action, feature drivers.
 */
export default function AiRecommendationCard({ recommendation = null }) {
  if (!recommendation) {
    return (
      <section className="oc-panel oc-panel--ai flex min-w-0 flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="oc-section-title">Live KI-Analyse</h2>
        </div>
        <p className="text-sm text-slate-500">
          Warte auf live_monitor →{" "}
          <code className="text-slate-400">live_run_evaluations</code>. Keine
          Demo-Texte, keine erfundenen Accuracy-%.
        </p>
      </section>
    );
  }

  const status = String(recommendation.overall_status || "").toUpperCase();
  const tone = STATUS_TONE[status] || "text-slate-300 border-white/15 bg-white/5";
  const tags = Array.isArray(recommendation.provenance_tags)
    ? recommendation.provenance_tags
    : [];
  const drivers = (recommendation.feature_drivers || []).filter((f) =>
    ["CRITICAL", "WARNING"].includes(String(f.feature_status || "").toUpperCase())
  );

  return (
    <section className="oc-panel oc-panel--ai flex min-w-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="oc-section-title">Live KI-Analyse</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <ProvenanceBadge
            source={recommendation.value_source || "RULE_BASED"}
            label={recommendation.display_label}
          />
          {tags
            .filter((t) => t !== recommendation.value_source)
            .map((t) => (
              <ProvenanceBadge key={t} source={t} />
            ))}
        </div>
      </div>

      {/* Traffic / chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {status ? (
          <span
            className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
          >
            {status}
          </span>
        ) : null}
        {recommendation.detected_state ? (
          <span className="inline-flex rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase text-slate-300">
            State: {recommendation.detected_state}
          </span>
        ) : null}
        {recommendation.active_regime ? (
          <span className="inline-flex rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase text-slate-300">
            Regime: {recommendation.active_regime}
          </span>
        ) : null}
        {recommendation.stability_status ? (
          <span className="inline-flex rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase text-slate-300">
            {recommendation.stability_status}
          </span>
        ) : null}
        {recommendation.ml_is_anomaly === true ? (
          <span className="inline-flex rounded border border-rose-500/40 bg-rose-950/50 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-300">
            Anomalie
            {recommendation.ml_anomaly_score != null
              ? ` · ${Number(recommendation.ml_anomaly_score).toFixed(2)}`
              : ""}
          </span>
        ) : recommendation.ml_is_anomaly === false ? (
          <span className="inline-flex rounded border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] uppercase text-emerald-300/90">
            Keine Anomalie
          </span>
        ) : null}
        {recommendation.drift_score != null ? (
          <span className="inline-flex rounded border border-sky-500/30 bg-sky-950/30 px-2 py-0.5 text-[10px] text-sky-200">
            Drift {Number(recommendation.drift_score).toFixed(2)}
          </span>
        ) : null}
      </div>

      <p className="break-words text-sm leading-relaxed text-slate-200">
        {recommendation.text || recommendation.explanation_text}
      </p>

      {recommendation.action ? (
        <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-950/35 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
            Empfohlene Aktion
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-100">
            {recommendation.action}
          </p>
        </div>
      ) : null}

      {drivers.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-white/5 pt-2">
          <li className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Feature-Treiber
          </li>
          {drivers.slice(0, 5).map((f) => (
            <li
              key={f.feature_name || f.id}
              className="flex justify-between gap-2 text-[11px] text-slate-400"
            >
              <span className="truncate">{f.feature_name}</span>
              <span
                className={
                  String(f.feature_status).toUpperCase() === "CRITICAL"
                    ? "shrink-0 text-rose-300"
                    : "shrink-0 text-amber-300"
                }
              >
                {f.feature_status}
                {f.z_score != null ? ` z=${Number(f.z_score).toFixed(1)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <Link to="/prediction" className="oc-cta-green mt-5">
        Vorhersagen &amp; Aktionen →
      </Link>
    </section>
  );
}
