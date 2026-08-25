import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LiveTrendsPanel from "./LiveTrendsPanel";
import {
  IconChevronDown,
  IconGateway,
  IconNetwork,
  IconOffice,
} from "./OcIcons";

export const MACHINE_IMAGES = {
  extruder: "/oc-machines/extruder-1.png",
  dosierer: "/oc-machines/dosierer.png",
  granulator: "/oc-machines/granulator.png",
  siebwechsler: "/oc-machines/siebwechsler.png",
  kuehlung: "/oc-machines/kuehlung.png",
};

const LINE_PREVIEW = [
  { id: "dosierer", name: "Dosierer", image: MACHINE_IMAGES.dosierer },
  { id: "granulator", name: "Granulator", image: MACHINE_IMAGES.granulator },
  { id: "siebwechsler", name: "Siebwechsler", image: MACHINE_IMAGES.siebwechsler },
  { id: "kuehlung", name: "Kühlung", image: MACHINE_IMAGES.kuehlung },
];

const STATUS_STATE_DE = {
  ok: "Läuft",
  stopped: "Gestoppt",
  alarm: "Störung",
  warn: "Warnung",
  offline: "Nicht angebunden",
};

export function statusKeyForOpenMachine(machine) {
  const s = String(machine?.status || "").toUpperCase();
  if (["ALARM", "FAULT", "ERROR", "CRITICAL"].includes(s)) return "alarm";
  if (["WARN", "WARNING", "WARNUNG"].includes(s)) return "warn";
  if (["STOPPED", "OFF", "IDLE", "COOLING", "HEATING"].includes(s)) {
    if (s === "HEATING") return "warn";
    return "stopped";
  }
  if (["PRODUCTION", "READY", "ONLINE", "OK", "CONNECTED"].includes(s)) return "ok";
  if (machine?.connected || machine?.has_live_feed) return "ok";
  return "offline";
}

export function isMachineOpen(machine) {
  if (!machine) return false;
  return Boolean(machine.connected || machine.has_live_feed);
}

export function connectedStatusLabel(statusKey) {
  if (!statusKey || statusKey === "offline") return "Nicht angebunden";
  const state = STATUS_STATE_DE[statusKey] || "Verbunden";
  return `Verbunden / ${state}`;
}

export function buildOpenMachineCards({
  lineMachines = [],
  connectedMachine = null,
}) {
  let list = Array.isArray(lineMachines) ? [...lineMachines] : [];
  if (!list.length && connectedMachine && isMachineOpen(connectedMachine)) {
    list = [
      {
        id: connectedMachine.id,
        name: connectedMachine.name,
        status: connectedMachine.status,
        connected: true,
        has_live_feed: connectedMachine.has_live_feed !== false,
      },
    ];
  }
  const open = list.filter(isMachineOpen);
  open.sort((a, b) => {
    if (Boolean(b.has_live_feed) !== Boolean(a.has_live_feed)) {
      return Number(Boolean(b.has_live_feed)) - Number(Boolean(a.has_live_feed));
    }
    return String(a.name || a.id).localeCompare(String(b.name || b.id), "de");
  });
  return open.map((m, index) => {
    const displayName = String(m.name || m.id || `Maschine ${index + 1}`);
    return {
      id: m.id,
      name: displayName,
      statusKey: statusKeyForOpenMachine(m),
      hasLiveFeed: Boolean(m.has_live_feed),
    };
  });
}

function LiveMachineCard({ card, selected, onSelect }) {
  const canSelect = typeof onSelect === "function";
  return (
    <article
      role={canSelect ? "button" : undefined}
      tabIndex={canSelect ? 0 : undefined}
      aria-pressed={canSelect ? selected : undefined}
      aria-label={`${card.name} auswählen`}
      onClick={canSelect ? () => onSelect(card.id) : undefined}
      onKeyDown={
        canSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(card.id);
              }
            }
          : undefined
      }
      className={`oc-plant-card oc-plant-card--live ${
        selected ? "oc-plant-card--selected" : ""
      } ${canSelect ? "oc-plant-card--selectable" : ""}`}
    >
      <div className="oc-plant-card__img">
        <img src={MACHINE_IMAGES.extruder} alt={card.name} />
      </div>
      <h3 className="oc-plant-card__name">{card.name}</h3>
      <p className="oc-plant-card__status">
        <span className="oc-plant-card__dot" />
        {connectedStatusLabel(card.statusKey)}
      </p>
      {card.hasLiveFeed ? (
        <p className="oc-plant-card__live">LIVE</p>
      ) : null}
    </article>
  );
}

function GreyMachineCard({ name, image }) {
  return (
    <article className="oc-plant-card oc-plant-card--grey">
      <div className="oc-plant-card__img oc-plant-card__img--dim">
        <img src={image} alt={name} />
      </div>
      <h3 className="oc-plant-card__name">{name}</h3>
      <p className="oc-plant-card__offline">Nicht angebunden</p>
    </article>
  );
}

/**
 * Anlagenübersicht — mockup: network stack on top, machine cards below,
 * expandable "+N weitere Maschinen" footer. No invented LIVE machines.
 */
export default function ProductionMap({
  connectedMachine,
  greyMachines = [],
  lineMachines = [],
  remainingCount: _remainingCount = 0,
  connectedMachines: _connectedMachines = 0,
  totalMachines = 0,
  selectedMachineId = null,
  onSelectMachine,
  machineValues = [],
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const cards = buildOpenMachineCards({ lineMachines, connectedMachine });
  const primary = cards[0] || null;
  const dbTotal = Number(totalMachines) || 0;
  const overflow = Math.max(0, dbTotal - cards.length);

  const extraMachines = useMemo(() => {
    const shown = new Set(cards.map((c) => String(c.id)));
    const fromGrey = (greyMachines || []).filter(
      (m) => m?.id && !shown.has(String(m.id))
    );
    const fromLine = (lineMachines || []).filter(
      (m) => m?.id && !shown.has(String(m.id)) && !isMachineOpen(m)
    );
    const seen = new Set();
    const merged = [];
    for (const m of [...fromGrey, ...fromLine]) {
      const key = String(m.id);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(m);
    }
    return merged;
  }, [cards, greyMachines, lineMachines]);

  return (
    <section className="oc-panel oc-map-panel min-w-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <h2 className="oc-section-title">Anlagenübersicht · Extrusion Line 01</h2>
        <Link to="/machine" className="oc-map-all-btn">
          Alle anzeigen →
        </Link>
      </div>

      <div className="oc-plant">
        <div className="oc-plant-line">
          <div className="oc-plant-hub">
            <div className="oc-plant-net">
              <div className="oc-flow-node">
                <IconOffice className="h-4 w-4 text-slate-400" />
                <span>Office IT</span>
              </div>
              <IconChevronDown className="oc-flow-stack__arrow" />
              <div className="oc-flow-node oc-flow-node--active">
                <IconGateway className="h-4 w-4 text-emerald-400" />
                <span>Edge Gateway</span>
              </div>
              <IconChevronDown className="oc-flow-stack__arrow" />
              <div className="oc-flow-node">
                <IconNetwork className="h-4 w-4 text-slate-400" />
                <span>Produktionsnetzwerk</span>
              </div>
              <span className="oc-plant-stem" aria-hidden />
            </div>
            {primary ? (
              <LiveMachineCard
                card={primary}
                selected={
                  selectedMachineId != null &&
                  String(selectedMachineId) === String(primary.id)
                }
                onSelect={onSelectMachine}
              />
            ) : (
              <GreyMachineCard
                name="Extruder 1"
                image={MACHINE_IMAGES.extruder}
              />
            )}
          </div>

          {LINE_PREVIEW.map((m, index) => (
            <div key={m.id} className="oc-plant-sat">
              <span
                className={`oc-plant-join ${index === 0 ? "oc-plant-join--from-extruder" : ""}`}
                aria-hidden
              />
              <GreyMachineCard name={m.name} image={m.image} />
            </div>
          ))}
        </div>

        {overflow > 0 ? (
          <div className="oc-plant-more">
            <button
              type="button"
              className="oc-plant-more__btn"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
            >
              <span className="oc-plant-more__rule" aria-hidden />
              <span className="oc-plant-more__label">
                +{overflow} weitere Maschinen
              </span>
              <IconChevronDown
                className={`oc-plant-more__chev ${
                  moreOpen ? "oc-plant-more__chev--open" : ""
                }`}
              />
            </button>
            {moreOpen ? (
              extraMachines.length > 0 ? (
                <ul className="oc-plant-more__list">
                  {extraMachines.map((m) => (
                    <li key={m.id}>
                      {m.name || m.id}
                      <span>Nicht angebunden</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="oc-plant-more__hint">
                  {overflow} weitere Maschinen in der Datenbank — ohne
                  Live-Anbindung.
                </p>
              )
            ) : null}
          </div>
        ) : null}

        <div className="oc-plant-fill">
          <LiveTrendsPanel values={machineValues} embedded />
        </div>
      </div>
    </section>
  );
}
