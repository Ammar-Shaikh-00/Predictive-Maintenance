import { Link } from "react-router-dom";

/** Public asset used for Extruder 1–5 cards */
const EXTRUDER_IMG = "/extruder-machine.png";

/**
 * Anlagenübersicht — Extrusion Line 01
 * Machine cards: Extruder 1–5 only (no Dosierung / Siebwechsler).
 */

const STATUS_META = {
  ok: {
    label: "Online",
    footer: "Alle Systeme OK",
    dot: "bg-emerald-400",
    border: "border-emerald-500/60 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]",
    footerBg: "bg-emerald-500 text-white",
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
    label: "Offline",
    footer: "Offline",
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

export const DEFAULT_EXTRUDER_SLOTS = [
  { id: "extruder-1", name: "EXTRUDER 1", imageKey: "extruder" },
  { id: "extruder-2", name: "EXTRUDER 2", imageKey: "extruder" },
  { id: "extruder-3", name: "EXTRUDER 3", imageKey: "extruder" },
  { id: "extruder-4", name: "EXTRUDER 4", imageKey: "extruder" },
  { id: "extruder-5", name: "EXTRUDER 5", imageKey: "extruder" },
];

function normalizeStatus(raw) {
  const s = String(raw || "").toUpperCase();
  if (["ALARM", "FAULT", "ERROR", "CRITICAL"].includes(s)) return "alarm";
  if (["WARN", "WARNING", "WARNUNG"].includes(s)) return "warn";
  if (["OFFLINE", "OFF", "STOPPED"].includes(s)) return "offline";
  if (["UNLINKED", "NOT_CONNECTED", "GREY"].includes(s)) return "unlinked";
  if (["ONLINE", "OK", "PRODUCTION", "READY", "CONNECTED"].includes(s)) return "ok";
  return "offline";
}

export function buildExtruderLineCards({
  connectedMachine,
  greyMachines = [],
  slots = DEFAULT_EXTRUDER_SLOTS,
}) {
  const pool = [];
  if (connectedMachine) {
    pool.push({
      id: connectedMachine.id || "connected-0",
      name: connectedMachine.name,
      status: connectedMachine.status || "PRODUCTION",
      since: connectedMachine.since || connectedMachine.online_since || null,
      connected: true,
    });
  }
  for (const m of greyMachines || []) {
    pool.push({
      id: m.id,
      name: m.name,
      status: m.status || "NOT_CONNECTED",
      since: null,
      connected: false,
    });
  }

  return slots.map((slot, index) => {
    const live = pool[index];
    if (!live) {
      return {
        ...slot,
        statusKey: "offline",
        since: null,
        connected: false,
      };
    }
    const statusKey = live.connected
      ? normalizeStatus(live.status)
      : live.status === "ALARM" || live.status === "FAULT"
        ? "alarm"
        : "offline";
    return {
      ...slot,
      id: live.id || slot.id,
      name: slot.name,
      liveName: live.name,
      statusKey: statusKey === "unlinked" && live.connected ? "ok" : statusKey,
      since: live.since,
      connected: Boolean(live.connected),
    };
  });
}

function MachineCard({ card, imageSrc }) {
  const meta = STATUS_META[card.statusKey] || STATUS_META.offline;
  const dimmed = card.statusKey === "offline" || card.statusKey === "unlinked";

  return (
    <article
      className={`relative z-[1] flex w-[140px] shrink-0 flex-col overflow-hidden rounded-xl border bg-[#12161e] sm:w-[150px] ${meta.border} ${
        dimmed ? "opacity-55" : ""
      }`}
    >
      <div className="px-3 pt-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-100">
          {card.name}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          <span>{meta.label}</span>
          {card.since ? <span className="text-slate-500">Seit {card.since}</span> : null}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-1 py-3">
        <img
          src={imageSrc}
          alt={card.name}
          className={`h-[110px] w-full max-w-[200px] object-contain object-center scale-[1.35] ${
            dimmed ? "opacity-70 grayscale" : ""
          }`}
        />
      </div>

      <div
        className={`mx-2 mb-2 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium ${meta.footerBg}`}
      >
        {card.statusKey === "ok" ? <span aria-hidden>✓</span> : null}
        {card.statusKey === "alarm" ? (
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        ) : null}
        {meta.footer}
      </div>
    </article>
  );
}

function MoreMachinesCard({ count }) {
  if (count <= 0) return null;
  return (
    <article className="relative z-[1] flex w-[120px] shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-[#12161e] px-3 py-4 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
        +{count} weitere Maschinen
      </p>
      <p className="mt-1 text-[10px] text-amber-500/90">Nicht angebunden</p>
      <div className="mt-4 text-slate-600" aria-hidden>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
    </article>
  );
}

export default function ProductionMap({
  connectedMachine,
  greyMachines = [],
  remainingCount = 0,
  connectedMachines = 0,
  totalMachines = 20,
  networkNotes = [],
  machineImages = {},
}) {
  const cards = buildExtruderLineCards({
    connectedMachine,
    greyMachines,
    slots: DEFAULT_EXTRUDER_SLOTS,
  });

  const more = Math.max(
    0,
    remainingCount > 0
      ? remainingCount
      : Math.max(0, (totalMachines || 0) - DEFAULT_EXTRUDER_SLOTS.length)
  );

  const lineFullyOk =
    connectedMachines > 0 && connectedMachines >= (totalMachines || 0);
  const imageSrc = machineImages.extruder || EXTRUDER_IMG;

  return (
    <section className="oc-panel min-w-0 overflow-hidden">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="oc-section-title">Anlagenübersicht — Extrusionslinie 01</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online &amp; OK
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Warnung
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Alarm
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Offline
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full ring-1 ring-slate-500" /> Nicht
              angebunden
            </span>
          </div>
        </div>
        <Link to="/machine" className="oc-map-all-btn">
          Alle anzeigen →
        </Link>
      </div>

      <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-[180px_minmax(0,1fr)]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-col lg:pt-6">
          <div className="rounded-xl border border-white/10 bg-[#1a1f27] px-3 py-3">
            <div className="mb-1 text-slate-400" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
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
          <div className="mx-auto hidden h-5 w-px border-l-2 border-dashed border-sky-500/60 lg:block" />
          <div className="rounded-xl border border-white/10 bg-[#1a1f27] px-3 py-3">
            <div className="mb-1 text-slate-400" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="7" y="3" width="10" height="18" rx="1" />
                <path d="M10 7h4M10 11h4M10 15h2" />
              </svg>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              Edge-Gateway
            </p>
            <p className="mt-1 text-xs text-emerald-300/90">
              {connectedMachines}/{totalMachines || 20} Maschinen verbunden
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 rounded-xl border border-white/10 bg-[#1a1f27] px-3 py-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-200">
              Produktionsnetzwerk (Maschinen)
            </p>
            <p
              className={`mt-0.5 text-xs ${
                lineFullyOk ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {lineFullyOk
                ? "Vollständig angebunden"
                : "Nicht vollständig angebunden"}
            </p>
          </div>

          <div className="relative min-w-0">
            <div
              className="pointer-events-none absolute left-2 right-2 top-1/2 hidden h-px -translate-y-1/2 bg-slate-600/70 sm:block"
              aria-hidden
            />
            <div className="relative -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {cards.map((card) => (
                <MachineCard key={card.id} card={card} imageSrc={imageSrc} />
              ))}
              <MoreMachinesCard count={more} />
            </div>
          </div>
        </div>
      </div>

      {networkNotes.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-white/5 pt-3">
          {networkNotes.map((note) => (
            <li key={note} className="flex items-start gap-2 text-xs text-amber-200/90">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              {note}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
