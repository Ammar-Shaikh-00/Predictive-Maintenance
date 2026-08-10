import ProvenanceBadge from "./ProvenanceBadge";

const STATUS_DE = {
  PRODUCTION: "PRODUKTION",
  READY: "BEREIT",
  HEATING: "AUFHEIZEN",
  COOLING: "ABKÜHLEN",
  FAULT: "STÖRUNG",
  STOPPED: "GESTOPPT",
};

/**
 * PDF-style plant status header: ANLAGENSTATUS / PRODUKTION / Online seit …
 */
export default function PlantStatusHeader({
  plantStatus = "PRODUCTION",
  online = true,
  sinceLabel = null,
  lineName = "Extrusionslinie 01",
  lastTick = null,
}) {
  const label = STATUS_DE[String(plantStatus).toUpperCase()] || plantStatus || "—";
  const since =
    sinceLabel ||
    (lastTick
      ? lastTick.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
      : null);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#141820] px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Anlagenstatus
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-300 sm:text-3xl">
              {label}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${
                online
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-500/40 bg-slate-500/10 text-slate-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  online ? "bg-emerald-400" : "bg-slate-500"
                }`}
              />
              {online ? "Online" : "Offline"}
              {since ? ` · Seit ${since} Uhr` : ""}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{lineName}</p>
        </div>
        <ProvenanceBadge source={online ? "LIVE" : "MANUAL"} />
      </div>
    </section>
  );
}
