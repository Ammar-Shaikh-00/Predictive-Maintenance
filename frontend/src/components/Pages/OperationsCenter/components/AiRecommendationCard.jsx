import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import ProvenanceBadge from "./ProvenanceBadge";

const STATUS_CHIP_CLASS = {
  CRITICAL: "oc-chip oc-chip--crit",
  WARNING: "oc-chip oc-chip--warn",
  NORMAL: "oc-chip oc-chip--ok",
};

/**
 * Module 7 — Live KI-Analyse (mockup: yellow border card).
 * All visible labels come from i18n — falls back to "de" by default.
 */
export default function AiRecommendationCard({ recommendation = null }) {
  const { t } = useTranslation();

  if (!recommendation) {
    return (
      <section className="oc-panel oc-ai-panel">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="oc-section-title">{t("aiAnalysis.title")}</h2>
        </div>
        <p className="text-sm text-slate-500">{t("aiAnalysis.noData")}</p>
      </section>
    );
  }

  const statusKey = String(recommendation.overall_status || "").toUpperCase();
  const chipClass = STATUS_CHIP_CLASS[statusKey] || "oc-chip";
  const statusLabel = statusKey
    ? t(`aiAnalysis.status.${statusKey}`, { defaultValue: statusKey })
    : null;

  const stabilityKey = String(recommendation.stability_status || "").toUpperCase();
  const stabilityLabel = stabilityKey
    ? t(`aiAnalysis.stability.${stabilityKey}`, { defaultValue: recommendation.stability_status })
    : null;

  return (
    <section className="oc-panel oc-ai-panel">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <h2 className="oc-section-title">{t("aiAnalysis.title")}</h2>
        <ProvenanceBadge
          source={recommendation.value_source || "RULE_BASED"}
          label={recommendation.display_label || "REGELBASIERTE AUSWERTUNG"}
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {statusLabel ? (
          <span className={chipClass}>{statusLabel}</span>
        ) : null}

        {recommendation.detected_state ? (
          <span className="oc-chip">
            {t("aiAnalysis.state")} {recommendation.detected_state}
          </span>
        ) : null}

        {recommendation.active_regime ? (
          <span className="oc-chip oc-chip--regime">
            {t("aiAnalysis.regime")} {recommendation.active_regime}
          </span>
        ) : null}

        {stabilityLabel ? (
          <span className="oc-chip">{stabilityLabel}</span>
        ) : null}

        {recommendation.ml_is_anomaly === true ? (
          <span className="oc-chip oc-chip--crit">{t("aiAnalysis.anomaly")}</span>
        ) : null}

        {recommendation.drift_score != null ? (
          <span className="oc-chip">
            {t("aiAnalysis.drift")} {Number(recommendation.drift_score).toFixed(2)}
          </span>
        ) : null}
      </div>

      <p className="text-sm leading-relaxed text-slate-200">
        {recommendation.text || recommendation.explanation_text}
      </p>

      {recommendation.action ? (
        <p className="oc-ai-action mt-3">
          {t("aiAnalysis.action")}: {recommendation.action}
        </p>
      ) : null}

      <Link
        to="/predictions"
        className="mt-3 inline-block text-[11px] text-emerald-400/90 hover:underline"
      >
        {t("aiAnalysis.link")} →
      </Link>
    </section>
  );
}
