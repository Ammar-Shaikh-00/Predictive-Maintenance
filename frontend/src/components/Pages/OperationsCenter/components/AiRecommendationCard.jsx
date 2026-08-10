import { Link } from "react-router-dom";
import ProvenanceBadge from "./ProvenanceBadge";

/**
 * PDF "KI EMPFEHLUNG" — stacked under timeline on the left column.
 */
export default function AiRecommendationCard({ recommendation = null }) {
  return (
    <section className="oc-panel oc-panel--ai flex min-w-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="oc-section-title">KI Empfehlung</h2>
        {recommendation ? (
          <ProvenanceBadge
            source={recommendation.value_source || "SIMULATED"}
            label={recommendation.display_label}
          />
        ) : null}
      </div>

      {!recommendation ? (
        <p className="text-sm text-slate-500">
          Keine KI-Empfehlung verfügbar — erscheint, wenn Regel-/ML-Dienst Ergebnisse
          liefert. Keine erfundenen Vorhersagen.
        </p>
      ) : (
        <>
          <p className="break-words text-sm leading-relaxed text-slate-200">
            {recommendation.text}
            {recommendation.action ? (
              <>
                {" "}
                <span className="text-slate-300">
                  Empfehlung: {recommendation.action}
                </span>
              </>
            ) : null}
          </p>
          <Link to="/maintenance" className="oc-cta-green mt-5">
            Details anzeigen →
          </Link>
        </>
      )}
    </section>
  );
}
