import { Link } from "react-router-dom";

function Field({ label, value, source = "LIVE" }) {
  const empty = value === null || value === undefined || value === "";
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
          {empty ? "N/A" : source}
        </span>
      </div>
      <p className={`mt-1 text-sm font-medium ${empty ? "text-slate-500" : "text-slate-100"}`}>
        {empty ? "—" : String(value)}
      </p>
    </div>
  );
}

function thresholdSummary(material, sensors) {
  const rows = Array.isArray(material?.thresholds) ? material.thresholds : [];
  if (!rows.length) return null;
  return rows
    .map((t) => {
      const sensor =
        sensors.find((s) => String(s.id) === String(t.sensor_id)) ||
        null;
      const name = t.sensor_name || sensor?.name || "Sensor";
      return `${name}: ${t.min_value}–${t.max_value}`;
    })
    .join(" · ");
}

/**
 * Module 12 material profile card — honest empty fields for optima / energy / scrap.
 */
export default function MaterialCard({
  material,
  sensors = [],
  onEdit,
  onToggle,
  handleDelete,
}) {
  const thresholds = thresholdSummary(material, sensors);

  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-[#141820] p-4 transition hover:border-emerald-500/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-50">
            {material?.name || "—"}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Referenzprofil für Sensorfenster
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            material?.active
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              : "border-white/15 bg-white/5 text-slate-400"
          }`}
        >
          {material?.active ? "Aktiv" : "Inaktiv"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field
          label="Sensorfenster"
          value={thresholds}
          source="LIVE"
        />
        <Field
          label="Produktfamilie"
          value={material?.product_family}
          source="LIVE"
        />
        <Field
          label="Materialtyp"
          value={material?.material_type}
          source="LIVE"
        />
        <Field label="Energie-Optima" value={null} />
        <Field label="Ausschuss-Optima" value={null} />
        <Field label="Empfohlene Einstellungen" value={null} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100"
        >
          {material?.active ? "Deaktivieren" : "Aktivieren"}
        </button>
        <button
          type="button"
          onClick={() => handleDelete(material)}
          className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10"
        >
          Löschen
        </button>
        <Link
          to="/material-batches"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200"
        >
          Chargen
        </Link>
      </div>
    </article>
  );
}
