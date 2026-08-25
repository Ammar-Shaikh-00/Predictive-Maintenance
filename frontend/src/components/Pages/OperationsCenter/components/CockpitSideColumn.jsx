import { useTranslation } from "react-i18next";
import { sourceLabel } from "../../../../utils/capabilityEngine";
import { IconCheck, IconLock } from "./OcIcons";
import OcCapabilityScorecard from "./OcCapabilityScorecard";

/**
 * Right column — capability scorecard + locked functions + provenance.
 * Scorecard rows come from backend catalog probes, not a local checklist.
 */
export default function CockpitSideColumn({
  progress = 0,
  checklistDone = [],
  checklistOpen = [],
  features = [],
  connectedMachines = 0,
  totalMachines = 0,
  capability = null,
}) {
  const { t } = useTranslation();
  const fromCatalog = Array.isArray(capability?.components) && capability.components.length > 0;
  const locked = fromCatalog
    ? (capability.components || [])
        .filter((row) => row.status === "locked" && (row.unlocks || []).length)
        .flatMap((row) =>
          (row.unlocks || []).map((item) => ({
            key: item.feature_key,
            name: item.label_de || item.feature_key,
            missingSources: [row.component_key],
            requires: [row.label_de || row.component_key],
          }))
        )
        .filter((row, idx, all) => all.findIndex((x) => x.key === row.key) === idx)
        .slice(0, 3)
    : (features || []).filter((f) => f.status !== "active").slice(0, 3);

  const pct = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <aside className="oc-side-col space-y-3">
      {fromCatalog ? (
        <OcCapabilityScorecard
          capability={{
            ...capability,
            connected_machines: capability.connected_machines ?? connectedMachines,
            total_machines: capability.total_machines ?? totalMachines,
          }}
        />
      ) : (
        <section className="oc-panel oc-side-progress">
          <h2 className="oc-section-title">Digitalisierungsfortschritt</h2>
          <div className="mt-3 flex items-end justify-between gap-2">
            <p className="text-3xl font-semibold tabular-nums text-white">{pct}%</p>
          </div>
          <div className="oc-progress-track mt-2">
            <div className="oc-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <ul className="mt-3 space-y-1.5">
            {checklistDone.slice(0, 5).map((item) => (
              <li key={item.key} className="oc-check-row oc-check-row--done">
                <IconCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>{shortLabel(item.label || sourceLabel(item.key))}</span>
              </li>
            ))}
            {checklistOpen.slice(0, 5).map((item) => (
              <li key={item.key} className="oc-check-row">
                <span className="oc-check-box" />
                <span>{shortLabel(item.label || sourceLabel(item.key))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">
            {connectedMachines} von {totalMachines} Maschinen angebunden
          </p>
        </section>
      )}

      <section className="oc-panel oc-side-locked">
        <h2 className="oc-section-title">Freischaltbare Funktionen</h2>
        <ul className="mt-3 space-y-2">
          {(locked.length ? locked : DEFAULT_LOCKED).map((f) => (
            <li key={f.key || f.name} className="oc-locked-row">
              <IconLock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-300">
                  {f.name}
                </p>
                <p className="truncate text-[10px] text-slate-500">
                  Benötigt:{" "}
                  {(f.missingSources || f.requires || [])
                    .map((s) => sourceLabel(s))
                    .join(", ") || "—"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="oc-provenance-legend">
        <p className="oc-provenance-legend__title">{t("provenance.title")}</p>
        <div className="oc-provenance-legend__chips">
          <span className="oc-prov oc-prov--live">{t("provenance.LIVE")}</span>
          <span className="oc-prov oc-prov--rule">{t("provenance.RULE_BASED")}</span>
          <span className="oc-prov oc-prov--derived">{t("provenance.DERIVED")}</span>
          <span className="oc-prov oc-prov--sim">{t("provenance.SIMULATED")}</span>
        </div>
      </section>
    </aside>
  );
}

const DEFAULT_LOCKED = [
  {
    key: "scrap",
    name: "Ausschussvorhersage",
    missingSources: ["quality_data"],
  },
  {
    key: "rul",
    name: "Restlaufzeit Werkzeug",
    missingSources: ["maintenance_history"],
  },
  {
    key: "energy",
    name: "Energieoptimierung",
    missingSources: ["energy_data"],
  },
];

function shortLabel(label) {
  const map = {
    "Live-Sensordaten": "Sensors",
    "Live-Sensoren": "Sensors",
    "KI-Server": "KI-Server",
    "SQL-Datenbank": "Datenbank",
    Qualitätsdaten: "Qualitätsdaten",
    Wartungssystem: "Wartung",
    Wartungshistorie: "Wartung",
    Energiezähler: "Energie",
    Energiedaten: "Energie",
    Maschinendaten: "Maschinendaten",
    Maschinenstatus: "Maschinenstatus",
    Produktionshistorie: "Historie",
    Materialchargen: "Material",
    Bedienerereignisse: "Bediener",
    "Validierte Modelle": "Modelle",
  };
  return map[label] || label;
}
