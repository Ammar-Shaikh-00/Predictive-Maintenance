/**
 * Top KPI strip — matches production-ready homepage mockup.
 * PRODUKTION · VORHERSAGEBEREITSCHAFT · OEE · WARTUNG · WARNUNGEN
 * Never invent Accuracy % — readiness shows — until AI/ML reports.
 */

const STATUS_DE = {
  PRODUCTION: "LÄUFT",
  LOW_PRODUCTION: "NIEDRIGE PROD.",
  READY: "BEREIT",
  HEATING: "AUFHEIZEN",
  COOLING: "ABKÜHLEN",
  FAULT: "STÖRUNG",
  STOPPED: "GESTOPPT",
  OFF: "AUS",
};

export default function OcHeroKpis({
  plantStatus = "STOPPED",
  online = false,
  readiness = null,
  readinessHint = null,
  oee = null,
  oeeHint = null,
  nextMaintenanceDays = null,
  maintenanceHint = null,
  alarmsCritical = 0,
  alarmsWarning = 0,
}) {
  const statusKey = String(plantStatus || "").toUpperCase();
  const statusLabel = STATUS_DE[statusKey] || statusKey || "—";
  const running = ["PRODUCTION", "READY", "HEATING", "COOLING", "LOW_PRODUCTION"].includes(statusKey);
  const readinessValue =
    readiness != null && Number.isFinite(Number(readiness))
      ? Math.round(Number(readiness))
      : null;
  const alarmTotal = (alarmsCritical || 0) + (alarmsWarning || 0);
  const hasMaintenance =
    nextMaintenanceDays != null && Number.isFinite(Number(nextMaintenanceDays));

  return (
    <div className="oc-kpi-strip oc-kpi-strip--mock">
      <article className="oc-kpi-m">
        <p className="oc-kpi-m__label">Produktion</p>
        <p
          className={`oc-kpi-m__value ${
            running ? "oc-kpi-m__value--ok" : "oc-kpi-m__value--stop"
          }`}
        >
          <span
            className={`oc-kpi-m__dot ${running ? "oc-kpi-m__dot--ok" : "oc-kpi-m__dot--off"}`}
          />
          {statusLabel}
        </p>
      </article>

      <article className="oc-kpi-m">
        <p className="oc-kpi-m__label">Vorhersagebereitschaft</p>
        <p className="oc-kpi-m__value">
          {readinessValue != null ? `${readinessValue} %` : "—"}
        </p>
        <p className="oc-kpi-m__hint">
          {readinessValue != null
            ? readinessHint || "AI/ML-Dienst"
            : "AI/ML · noch nicht gemeldet"}
        </p>
      </article>

      <article className="oc-kpi-m" title={oee == null ? oeeHint || undefined : undefined}>
        <p className="oc-kpi-m__label">OEE</p>
        <p className="oc-kpi-m__value">
          {oee != null ? `${Number(oee).toFixed(0)} %` : "—"}
        </p>
        {oee == null ? (
          <p className="oc-kpi-m__hint">{oeeHint || "Quelle fehlt"}</p>
        ) : null}
      </article>

      <article
        className="oc-kpi-m"
        title={!hasMaintenance ? maintenanceHint || undefined : undefined}
      >
        <p className="oc-kpi-m__label">Nächste Wartung</p>
        <p className="oc-kpi-m__value">
          {hasMaintenance ? (
            <>
              {Number(nextMaintenanceDays)}{" "}
              <span className="oc-kpi-m__unit">Tage</span>
            </>
          ) : (
            "—"
          )}
        </p>
        {!hasMaintenance && maintenanceHint ? (
          <p className="oc-kpi-m__hint oc-kpi-m__hint--clamp">{maintenanceHint}</p>
        ) : null}
      </article>

      <article className="oc-kpi-m">
        <p className="oc-kpi-m__label">Aktive Warnungen</p>
        <p
          className={`oc-kpi-m__value ${
            alarmTotal > 0 ? "oc-kpi-m__value--warn" : ""
          }`}
        >
          {alarmTotal}
        </p>
      </article>
    </div>
  );
}
