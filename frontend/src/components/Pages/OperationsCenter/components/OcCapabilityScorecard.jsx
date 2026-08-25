import { useTranslation } from "react-i18next";
import { IconAlert, IconCheck, IconLock } from "./OcIcons";
import { healthTone, partitionScorecard, unlockLabel } from "../scorecardView";

function Ring({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg viewBox="0 0 72 72" className="oc-scorecard__ring" aria-hidden>
      <circle cx="36" cy="36" r={r} className="oc-scorecard__ring-track" />
      <circle
        cx="36"
        cy="36"
        r={r}
        className="oc-scorecard__ring-fill"
        strokeDasharray={`${dash} ${c}`}
      />
      <text x="36" y="40" textAnchor="middle" className="oc-scorecard__ring-text">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function StatusGlyph({ status, tone }) {
  if (status === "locked") {
    return <IconLock className="h-3.5 w-3.5 text-slate-500" />;
  }
  if (status === "degraded" || tone === "warn") {
    return <IconAlert className="h-3.5 w-3.5 text-amber-400" />;
  }
  return <IconCheck className="h-3.5 w-3.5 text-emerald-400" />;
}

function WorkBar({ pct, tone }) {
  const width = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className="oc-scorecard__bar-track" aria-hidden>
      <div
        className={`oc-scorecard__bar-fill oc-scorecard__bar-fill--${tone}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function ComponentRow({ row, bands, t }) {
  const tone = healthTone(row.work_pct, row.status, bands);
  const unlock = row.status === "locked" ? unlockLabel(row) : null;
  const metaBits = [];
  if (row.provided_by) {
    metaBits.push(`${t("scorecard.meta.providedBy")}: ${row.provided_by}`);
  }
  if (row.ml_provides_now !== undefined && row.ml_provides_now !== null) {
    metaBits.push(
      `${t("scorecard.meta.mlProvidesNow")}: ${String(row.ml_provides_now)}`
    );
  }
  if (row.expected_work_pct_now !== undefined && row.expected_work_pct_now !== null) {
    metaBits.push(
      `${t("scorecard.meta.expectedNow")}: ${row.expected_work_pct_now}%`
    );
  }
  return (
    <li className={`oc-scorecard__row oc-scorecard__row--${tone}`}>
      <StatusGlyph status={row.status} tone={tone} />
      <div className="oc-scorecard__row-main">
        <div className="oc-scorecard__row-top">
          <span className="oc-scorecard__label">{row.label_de || row.component_key}</span>
          <span className="oc-scorecard__pct">
            {row.status === "locked" ? "—" : `${Math.round(Number(row.work_pct) || 0)}%`}
          </span>
        </div>
        <WorkBar pct={row.status === "locked" ? 0 : row.work_pct} tone={tone} />
        {metaBits.length ? (
          <p className="oc-scorecard__meta">{metaBits.join(" · ")}</p>
        ) : null}
        {unlock ? <p className="oc-scorecard__unlock">{unlock}</p> : null}
      </div>
    </li>
  );
}

/**
 * Operations Center capability scorecard.
 * Renders GET /operations-center/overview.capability — never computes weights locally.
 */
export default function OcCapabilityScorecard({ capability }) {
  const { t } = useTranslation();
  const { digitalization, mlLayer } = partitionScorecard(capability);
  const pct = Math.round(Number(capability?.digitalization_progress) || 0);
  const bands = capability?.health_bands || {};
  const connected = digitalization.filter((row) =>
    ["active", "degraded"].includes(row.status)
  ).length;
  const locked = Number(capability?.locked_count ?? digitalization.filter((r) => r.status === "locked").length);
  const modelsLoaded = Number(capability?.models_loaded || 0);
  const modelsExpected = Number(capability?.models_expected || 6);
  const machinesConnected = Number(capability?.connected_machines || 0);
  const machinesTotal = Number(capability?.total_machines || 0);

  return (
    <section className="oc-panel oc-scorecard">
      <div className="oc-scorecard__hero">
        <Ring value={pct} />
        <div className="oc-scorecard__hero-copy">
          <h2 className="oc-section-title">{t("scorecard.title")}</h2>
          <p className="oc-scorecard__sub">
            {connected} {t("scorecard.of")} {digitalization.length || 11}{" "}
            {t("scorecard.sourcesConnected")}
          </p>
          <div className="oc-progress-track mt-2">
            <div className="oc-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <ul className="oc-scorecard__list">
        {digitalization.map((row) => (
          <ComponentRow key={row.component_key} row={row} bands={bands} t={t} />
        ))}
      </ul>

      {mlLayer.length ? (
        <div className="oc-scorecard__ml">
          <p className="oc-scorecard__ml-title">{t("scorecard.mlLayer")}</p>
          <ul className="oc-scorecard__chips">
            {mlLayer.map((row) => {
              const tone = healthTone(row.work_pct, row.status, bands);
              return (
                <li
                  key={row.component_key}
                  className={`oc-scorecard__chip oc-scorecard__chip--${tone}`}
                >
                  <span>{row.label_de}</span>
                  <strong>
                    {row.component_key === "anomaly_models"
                      ? `${modelsLoaded}/${modelsExpected}`
                      : row.status === "locked"
                        ? "—"
                        : `${Math.round(Number(row.work_pct) || 0)}%`}
                  </strong>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <p className="oc-scorecard__footer">
        {machinesConnected} {t("scorecard.of")} {machinesTotal}{" "}
        {t("scorecard.machines")} · {modelsLoaded}/{modelsExpected}{" "}
        {t("scorecard.models")} · {locked} {t("scorecard.sourcesOpen")}
      </p>
    </section>
  );
}
