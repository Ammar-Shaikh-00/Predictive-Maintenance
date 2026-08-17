import { Link } from "react-router-dom";
import plantIcon from "../../../../assets/operationCenterIcons/plant.svg";
import brainIcon from "../../../../assets/operationCenterIcons/brain.svg";
import clockIcon from "../../../../assets/operationCenterIcons/clock.svg";
import maintenanceIcon from "../../../../assets/operationCenterIcons/maintenance.svg";
import alarmIcon from "../../../../assets/operationCenterIcons/alarm.svg";

const STATUS_DE = {
  PRODUCTION: "PRODUKTION",
  READY: "BEREIT",
  HEATING: "AUFHEIZEN",
  COOLING: "ABKÜHLEN",
  FAULT: "STÖRUNG",
  STOPPED: "GESTOPPT",
};

const OEE_REQUIREMENT_DE =
  "Benötigt: Stillstandszeiten · Soll-/Ist-Durchsatz · Ausschussdaten (ERP/MES + Qualität) — wird nicht geschätzt.";

const MAINTENANCE_REQUIREMENT_DE =
  "Benötigt: Wartungsplan oder Verschleißteil-Termin (Wartungscenter) — wird nicht geschätzt.";

/**
 * Top KPI strip — matches Operations Center design screenshot.
 * Outer card → label → inner glow panel (value + pill | icon).
 * "KI-Genauigkeit" visual title; value remains Prediction Readiness (honest).
 */
export default function OcHeroKpis({
  plantStatus = "PRODUCTION",
  online = true,
  lastTick = null,
  readiness = null,
  readinessDelta = null,
  readinessHint = null,
  oee = null,
  oeeDelta = null,
  oeeHint = null,
  nextMaintenanceDays = null,
  maintenanceDelta = null,
  maintenanceHint = null,
  alarmsCritical = 0,
  alarmsWarning = 0,
}) {
  const statusLabel =
    STATUS_DE[String(plantStatus).toUpperCase()] || plantStatus || "—";
  const since = lastTick
    ? lastTick.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const readinessValue =
    readiness != null && Number.isFinite(Number(readiness))
      ? Math.round(Number(readiness))
      : null;
  const alarmTotal = (alarmsCritical || 0) + (alarmsWarning || 0);

  const oeeRequirement = oeeHint || OEE_REQUIREMENT_DE;
  const maintenanceRequirement = maintenanceHint || MAINTENANCE_REQUIREMENT_DE;
  const hasMaintenance =
    nextMaintenanceDays != null && Number.isFinite(Number(nextMaintenanceDays));

  return (
    <div className="oc-kpi-strip">
      <article className="oc-kpi">
        <p className="oc-kpi__label">Anlagenstatus</p>
        <div className="oc-kpi__panel">
          <div className="oc-kpi__main">
            <p className="oc-kpi__value oc-kpi__value--status">{statusLabel}</p>
            <div className="oc-kpi__meta">
              <span
                className={`oc-kpi__pill ${
                  online ? "oc-kpi__pill--green-solid" : "oc-kpi__pill--muted"
                }`}
              >
                <span className="oc-kpi__pill-dot" />
                {online ? "Verbunden" : "Getrennt"}
              </span>
              {since ? (
                <span className="oc-kpi__hint">Seit {since} Uhr</span>
              ) : null}
            </div>
          </div>
          <span className="oc-kpi__icon" aria-hidden>
            <img src={plantIcon} alt="" className="oc-kpi__glyph" />
          </span>
        </div>
      </article>

      <article className="oc-kpi">
        <p className="oc-kpi__label">Vorhersagebereitschaft</p>
        <div className="oc-kpi__panel">
          <div className="oc-kpi__main">
            <p className="oc-kpi__value">
              {readinessValue != null ? `${readinessValue}%` : "—"}
            </p>
            <div className="oc-kpi__meta">
              {readinessDelta != null ? (
                <>
                  <span
                    className={`oc-kpi__pill ${
                      readinessDelta >= 0
                        ? "oc-kpi__pill--green"
                        : "oc-kpi__pill--red"
                    }`}
                  >
                    <TrendIcon up={readinessDelta >= 0} />
                    {Math.abs(readinessDelta)}%
                  </span>
                  <span className="oc-kpi__hint">diese Woche</span>
                </>
              ) : (
                <span className="oc-kpi__hint">
                  {readinessHint ||
                    (readinessValue == null
                      ? "AI/ML-Score je Maschine"
                      : "AI/ML-Dienst")}
                </span>
              )}
            </div>
          </div>
          <span className="oc-kpi__icon" aria-hidden>
            <img src={brainIcon} alt="" className="oc-kpi__glyph" />
          </span>
        </div>
      </article>

      <article className="oc-kpi" title={oee == null ? oeeRequirement : undefined}>
        <p className="oc-kpi__label">OEE (Gesamt)</p>
        <div className="oc-kpi__panel">
          <div className="oc-kpi__main">
            <p className="oc-kpi__value">
              {oee != null ? `${Number(oee).toFixed(1)}%` : "—"}
            </p>
            <div className="oc-kpi__meta oc-kpi__meta--stack">
              {oee != null && oeeDelta != null ? (
                <>
                  <span
                    className={`oc-kpi__pill ${
                      oeeDelta >= 0 ? "oc-kpi__pill--green" : "oc-kpi__pill--red"
                    }`}
                  >
                    <TrendIcon up={oeeDelta >= 0} />
                    {oeeDelta >= 0 ? "" : "-"}
                    {Math.abs(Number(oeeDelta)).toFixed(1)}%
                  </span>
                  <span className="oc-kpi__hint">diese Woche</span>
                </>
              ) : oee != null ? (
                <Link to="/executive" className="oc-pill-btn oc-pill-btn--sm">
                  Details anzeigen →
                </Link>
              ) : (
                <>
                  <p className="oc-kpi__req">{oeeRequirement}</p>
                  <Link to="/executive" className="oc-pill-btn oc-pill-btn--sm">
                    Was fehlt? →
                  </Link>
                </>
              )}
            </div>
          </div>
          <span className="oc-kpi__icon" aria-hidden>
            <img src={clockIcon} alt="" className="oc-kpi__glyph" />
          </span>
        </div>
      </article>

      <article
        className="oc-kpi"
        title={!hasMaintenance ? maintenanceRequirement : maintenanceHint || undefined}
      >
        <p className="oc-kpi__label">Nächste Wartung</p>
        <div className="oc-kpi__panel">
          <div className="oc-kpi__main">
            <p className="oc-kpi__value">
              {hasMaintenance ? (
                <>
                  {Number(nextMaintenanceDays)}{" "}
                  <span className="oc-kpi__unit">TAGE</span>
                </>
              ) : (
                "—"
              )}
            </p>
            <div className="oc-kpi__meta oc-kpi__meta--stack">
              {hasMaintenance ? (
                <>
                  {maintenanceDelta != null ? (
                    <span className="oc-kpi__pill oc-kpi__pill--red">
                      <TrendIcon up />
                      {Math.abs(Number(maintenanceDelta))}%
                    </span>
                  ) : null}
                  <span className="oc-kpi__hint">
                    {maintenanceHint || "Nächster Termin"}
                  </span>
                  <Link to="/maintenance" className="oc-pill-btn oc-pill-btn--sm">
                    Details anzeigen →
                  </Link>
                </>
              ) : (
                <>
                  <p className="oc-kpi__req">{maintenanceRequirement}</p>
                  <Link to="/maintenance" className="oc-pill-btn oc-pill-btn--sm">
                    Wartung anlegen →
                  </Link>
                </>
              )}
            </div>
          </div>
          <span className="oc-kpi__icon" aria-hidden>
            <img src={maintenanceIcon} alt="" className="oc-kpi__glyph" />
          </span>
        </div>
      </article>

      <article className="oc-kpi">
        <p className="oc-kpi__label">Aktive Alarme</p>
        <div className="oc-kpi__panel">
          <div className="oc-kpi__main">
            <p
              className={`oc-kpi__value ${
                alarmTotal > 0 ? "oc-kpi__value--alarm" : ""
              }`}
            >
              {alarmTotal}
            </p>
            <div className="oc-kpi__meta">
              <span
                className="oc-kpi__pill oc-kpi__pill--red oc-kpi__pill--wide"
                title={`Kritisch: ${alarmsCritical} · Warnung: ${alarmsWarning}`}
              >
                <TrendIcon up={alarmTotal > 0} />
                <span className="oc-kpi__pill-text">
                  Kritisch: {alarmsCritical} · Warnung: {alarmsWarning}
                </span>
              </span>
            </div>
          </div>
          <span className="oc-kpi__icon" aria-hidden>
            <img src={alarmIcon} alt="" className="oc-kpi__glyph" />
          </span>
        </div>
      </article>
    </div>
  );
}

function TrendIcon({ up = true }) {
  return (
    <svg viewBox="0 0 16 16" className="oc-kpi__trend" aria-hidden>
      {up ? (
        <path
          d="M2 11l4-4 3 2 5-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M2 5l4 4 3-2 5 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
