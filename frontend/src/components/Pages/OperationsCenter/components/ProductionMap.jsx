import { Link } from "react-router-dom";
import { localizeUiText } from "../buildOcCockpit";

/** Public asset used for connected extruder cards */
const EXTRUDER_IMG = "/extruder-machine.png";

/**
 * Anlagenübersicht — Extrusion Line 01
 * Honest map: only machines that are connected / have live data appear as open cards.
 * All others stay collapsed in “+N weitere Maschinen”.
 */

const STATUS_META = {
  ok: {
    label: "Verbunden",
    footer: "Alle Systeme OK",
    dot: "bg-emerald-400",
    border: "border-emerald-400/70",
    footerBg: "bg-emerald-500 text-white",
  },
  stopped: {
    label: "Verbunden",
    footer: "Gestoppt",
    dot: "bg-emerald-400",
    border: "border-emerald-400/50",
    footerBg: "bg-emerald-950/80 text-emerald-200",
  },
  alarm: {
    label: "Alarm",
    footer: "Alarm erkannt",
    dot: "bg-rose-500",
    border: "border-rose-500/40",
    footerBg: "bg-rose-950/90 text-rose-200",
  },
  warn: {
    label: "Warnung",
    footer: "Warnung",
    dot: "bg-amber-400",
    border: "border-amber-500/40",
    footerBg: "bg-amber-950/80 text-amber-100",
  },
  offline: {
    label: "Getrennt",
    footer: "Getrennt",
    dot: "bg-slate-500",
    border: "border-white/10",
    footerBg: "bg-[#1a1f27] text-slate-500",
  },
  unlinked: {
    label: "Nicht angebunden",
    footer: "Nicht angebunden",
    dot: "bg-transparent ring-1 ring-slate-500",
    border: "border-dashed border-white/15",
    footerBg: "bg-transparent text-amber-400/90",
  },
};

/** Connected machine process state — never map STOPPED → Getrennt. */
export function statusKeyForOpenMachine(machine) {
  const s = String(machine?.status || "").toUpperCase();
  if (["ALARM", "FAULT", "ERROR", "CRITICAL"].includes(s)) return "alarm";
  if (["WARN", "WARNING", "WARNUNG"].includes(s)) return "warn";
  if (["STOPPED", "OFF", "IDLE", "COOLING", "HEATING"].includes(s)) {
    // Still on the network — show connected process state, not “Getrennt”
    if (s === "HEATING") return "warn";
    if (s === "COOLING") return "stopped";
    return "stopped";
  }
  if (["PRODUCTION", "READY", "ONLINE", "OK", "CONNECTED"].includes(s)) return "ok";
  // Flags say connected/live even if status string is missing/NOT_CONNECTED
  if (machine?.connected || machine?.has_live_feed) return "ok";
  return "offline";
}

export function isMachineOpen(machine) {
  if (!machine) return false;
  return Boolean(machine.connected || machine.has_live_feed);
}

/**
 * Only open/connected machines become selectable cards.
 */
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

  // Live-feed owner first, then by name
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
      name: displayName.toUpperCase(),
      liveName: displayName,
      statusKey: statusKeyForOpenMachine(m),
      since: m.since || null,
      connected: true,
      selectable: true,
      hasLiveFeed: Boolean(m.has_live_feed),
    };
  });
}

function MachineCard({ card, imageSrc, selected = false, onSelect }) {
  const meta = STATUS_META[card.statusKey] || STATUS_META.ok;
  const isLive = card.statusKey === "ok" || card.statusKey === "stopped";
  const canSelect = card.selectable !== false && typeof onSelect === "function";

  return (
    <div className="oc-machine-col">
      <span className="oc-machine-col__bus" aria-hidden />
      <span className="oc-machine-col__drop" aria-hidden />
      <article
        role={canSelect ? "button" : undefined}
        tabIndex={canSelect ? 0 : undefined}
        aria-pressed={canSelect ? selected : undefined}
        aria-label={
          canSelect
            ? `${card.name} auswählen${selected ? " (ausgewählt)" : ""}`
            : card.name
        }
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
        className={`oc-machine-card relative z-[1] flex w-full flex-col overflow-hidden rounded-xl border bg-[#12161e] ${meta.border} ${
          isLive ? "oc-machine-card--live" : ""
        } ${selected ? "oc-machine-card--selected" : ""} ${
          canSelect ? "oc-machine-card--selectable cursor-pointer" : ""
        }`}
      >
        <div className="min-w-0 px-3 pt-3">
          <h3 className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-100">
            {card.name}
          </h3>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px]">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
            <span
              className={
                isLive
                  ? "text-emerald-400"
                  : card.statusKey === "alarm"
                    ? "text-rose-400"
                    : "text-slate-400"
              }
            >
              {meta.label}
            </span>
            {selected ? (
              <span className="truncate text-emerald-300/90">Ausgewählt</span>
            ) : null}
            {card.hasLiveFeed ? (
              <span className="truncate text-slate-500">Live-Daten</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden px-1 py-3">
          <img
            src={imageSrc}
            alt={card.name}
            className="h-[110px] w-full max-w-[200px] scale-[1.35] object-contain object-center"
          />
        </div>

        <div
          className={`mx-2 mb-2 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium ${meta.footerBg}`}
        >
          {card.statusKey === "ok" ? <span aria-hidden>✓</span> : null}
          {card.statusKey === "alarm" ? (
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          ) : null}
          <span className="truncate">{meta.footer}</span>
        </div>
      </article>
    </div>
  );
}

function MoreMachinesCard({ count }) {
  if (count <= 0) return null;
  return (
    <div className="oc-machine-col oc-machine-col--more">
      <span className="oc-machine-col__bus" aria-hidden />
      <span className="oc-machine-col__drop" aria-hidden />
      <article className="oc-machine-card relative z-[1] flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-[#12161e] px-3 py-4 text-center">
        <p className="text-[11px] font-semibold uppercase leading-snug tracking-wide text-amber-300">
          +{count} weitere Maschinen
        </p>
        <p className="mt-1 text-[10px] text-amber-500/90">Nicht angebunden</p>
        <div className="mt-4 text-slate-600" aria-hidden>
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
      </article>
    </div>
  );
}

export default function ProductionMap({
  connectedMachine,
  greyMachines = [],
  lineMachines = [],
  remainingCount = 0,
  connectedMachines = 0,
  totalMachines = 20,
  networkNotes = [],
  machineImages = {},
  selectedMachineId = null,
  onSelectMachine,
}) {
  const cards = buildOpenMachineCards({
    lineMachines,
    connectedMachine,
  });

  const openCount = cards.length;
  const more = Math.max(
    0,
    remainingCount > 0
      ? remainingCount
      : Math.max(0, (totalMachines || 0) - openCount)
  );

  const lineFullyOk =
    connectedMachines > 0 && connectedMachines >= (totalMachines || 0);
  const imageSrc = machineImages.extruder || EXTRUDER_IMG;

  return (
    <section className="oc-panel min-w-0 overflow-hidden">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="oc-section-title">
            Anlagenübersicht — Extrusionslinie 01
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Nur angebundene Maschinen mit Daten. Antippen wechselt die
            Betriebszentrale.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{" "}
              Verbunden &amp; OK
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Warnung
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Alarm
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Getrennt
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full ring-1 ring-slate-500" />{" "}
              Nicht angebunden
            </span>
          </div>
        </div>
        <Link to="/machine" className="oc-map-all-btn">
          Alle anzeigen →
        </Link>
      </div>

      <div className="oc-prod-layout">
        <div className="oc-infra">
          <div className="oc-infra__card">
            <div className="mb-1 text-slate-400" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="4" width="18" height="6" rx="1" />
                <rect x="3" y="14" width="18" height="6" rx="1" />
              </svg>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              Office IT-Netzwerk
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-300">
              <span className="text-emerald-400">✓</span> Verbunden
            </p>
          </div>
          <div className="oc-infra__link" aria-hidden />
          <div className="oc-infra__card oc-infra__card--edge">
            <div className="mb-1 text-slate-400" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="7" y="3" width="10" height="18" rx="1" />
                <path d="M10 7h4M10 11h4M10 15h2" />
              </svg>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              Edge-Gateway
            </p>
            <p className="mt-1 text-xs text-emerald-300/90">
              {Math.max(connectedMachines, openCount)}/{totalMachines || 20}{" "}
              Maschinen verbunden
            </p>
            <span className="oc-infra__to-line" aria-hidden />
          </div>
        </div>

        <div className="min-w-0">
          <div className="oc-prod-net">
            <div className="oc-prod-net__hub">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-200">
                Produktionsnetzwerk (Maschinen)
              </p>
              <p
                className={`mt-0.5 inline-flex items-center justify-center gap-1.5 text-xs ${
                  lineFullyOk ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {!lineFullyOk ? (
                  <span className="oc-prod-net__lock" aria-hidden>
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="3.5" y="7" width="9" height="7" rx="1.2" />
                      <path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" />
                    </svg>
                  </span>
                ) : null}
                {lineFullyOk
                  ? "Vollständig angebunden"
                  : openCount > 0
                    ? `${openCount} Maschine(n) mit Daten`
                    : "Keine Maschine mit Live-Daten"}
              </p>
            </div>

            <div className="oc-prod-net__stem" aria-hidden />

            <div className="oc-prod-net__scroll">
              <div className="oc-prod-net__row">
                {cards.length === 0 ? (
                  <p className="px-2 py-6 text-xs text-slate-500">
                    Keine angebundene Maschine mit verfügbaren Daten.
                  </p>
                ) : (
                  cards.map((card) => (
                    <MachineCard
                      key={card.id}
                      card={card}
                      imageSrc={imageSrc}
                      selected={
                        selectedMachineId != null &&
                        String(selectedMachineId) === String(card.id)
                      }
                      onSelect={onSelectMachine}
                    />
                  ))
                )}
                {more > 0 ? <MoreMachinesCard count={more} /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {networkNotes.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-white/5 pt-3">
          {networkNotes.map((note) => (
            <li
              key={note}
              className="flex items-start gap-2 text-xs text-amber-200/90"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              {localizeUiText(note)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
