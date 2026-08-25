import { Link } from "react-router-dom";

function Field({ label, value, source, emptyHint }) {
  const empty = value === null || value === undefined || value === "";
  const display = empty ? "—" : String(value);
  return (
    <div>
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        <span
          className={`rounded border px-1 py-0.5 text-[9px] ${
            empty
              ? "border-slate-500/30 text-slate-500"
              : "border-emerald-500/30 text-emerald-400/90"
          }`}
        >
          {empty ? "k. A." : source || "LIVE"}
        </span>
      </div>
      <p className={`mt-1 text-sm font-medium ${empty ? "text-slate-500" : "text-slate-100"}`}>
        {display}
      </p>
      {empty && emptyHint ? (
        <p className="mt-0.5 text-[10px] text-slate-600">{emptyHint}</p>
      ) : null}
    </div>
  );
}

function formatThresholds(sensor) {
  const parts = [];
  if (sensor.min_threshold != null) parts.push(`min ${sensor.min_threshold}`);
  if (sensor.warning_threshold != null) parts.push(`warn ${sensor.warning_threshold}`);
  if (sensor.critical_threshold != null) parts.push(`krit ${sensor.critical_threshold}`);
  if (sensor.max_threshold != null) parts.push(`max ${sensor.max_threshold}`);
  return parts.length ? parts.join(" · ") : null;
}

function formatWhen(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

/**
 * Sensor Center card (live) or mapping catalog card.
 */
export default function SensorCard({
  mode = "center",
  sensor,
  machineName,
  latest,
  onEdit,
  onDelete,
}) {
  if (mode === "mapping") {
    return (
      <article className="rounded-2xl border border-white/10 bg-[#141820] p-4">
        <h3 className="text-sm font-semibold text-slate-50">{sensor.name || "—"}</h3>
        <p className="mt-1 text-xs text-slate-400">
          Zuordnung: {sensor.map_val || "—"} · {machineName || "Keine Maschine"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {sensor.unit || "—"} {sensor.description ? `· ${sensor.description}` : ""}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10"
          >
            Löschen
          </button>
        </div>
      </article>
    );
  }

  const lastVal =
    latest?.value != null
      ? `${latest.value}${sensor.unit ? ` ${sensor.unit}` : ""}`
      : null;
  const historyHref = sensor.machine_id
    ? `/time-range-data-view?machine_id=${encodeURIComponent(sensor.machine_id)}`
    : "/time-range-data-view";

  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-[#141820] p-4 transition hover:border-emerald-500/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-50">
            {sensor.name || "—"}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {machineName || "Keine Maschine zugewiesen"} · {sensor.sensor_type || "Typ —"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
          {latest?.status || "—"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field
          label="Letzter Wert"
          value={lastVal}
          source={latest?.value_source || "LIVE"}
          emptyHint="Noch kein Messwert"
        />
        <Field
          label="Letzter Zeitpunkt"
          value={formatWhen(latest?.timestamp)}
          source="LIVE"
        />
        <Field
          label="Schwellenwerte"
          value={formatThresholds(sensor)}
          source="LIVE"
          emptyHint="Nicht konfiguriert"
        />
        <Field label="Einheit" value={sensor.unit} source="LIVE" />
        <Field
          label="Kalibrierung"
          value={null}
          emptyHint="Nicht angebunden"
        />
        <Field
          label="Signalqualität"
          value={null}
          emptyHint="Nicht angebunden"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={historyHref}
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200"
        >
          Historie auf Abruf
        </Link>
        <Link
          to="/machine"
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
        >
          Maschinen
        </Link>
      </div>
    </article>
  );
}
