import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { machineCriticalityColor } from "../../../assets/Data/ConstantData";

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "online") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (s === "maintenance" || s === "degraded")
    return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  return "border-white/15 bg-white/5 text-slate-400";
}

function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "online") return "Verbunden";
  if (s === "offline") return "Getrennt";
  if (s === "maintenance") return "Wartung";
  if (s === "degraded") return "Eingeschränkt";
  if (!status) return "Unbekannt";
  return String(status);
}

function criticalityLabel(value) {
  const c = String(value || "").toLowerCase();
  if (c === "low") return "Niedrig";
  if (c === "medium") return "Mittel";
  if (c === "high") return "Hoch";
  return value;
}

function Field({ label, value, source = "LIVE", muted = false }) {
  const display =
    value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        <span
          className={`rounded border px-1 py-0.5 text-[9px] ${
            muted || display === "—"
              ? "border-slate-500/30 text-slate-500"
              : "border-emerald-500/30 text-emerald-400/90"
          }`}
        >
          {display === "—" ? "k. A." : source}
        </span>
      </div>
      <p
        className={`mt-1 text-sm font-medium ${
          display === "—" ? "text-slate-500" : "text-slate-100"
        }`}
      >
        {display}
      </p>
    </div>
  );
}

/**
 * Module 10 machine card — photo/SN/AI/RUL show "—" unless real data exists.
 */
export default function MachineCard({
  machine,
  integration,
  sensorCount = 0,
  setSelectedMachine,
  setIsEditing,
}) {
  const { t } = useTranslation();
  const meta = machine?.metadata && typeof machine.metadata === "object"
    ? machine.metadata
    : {};
  const photo = meta.photo_url || meta.image_url || null;
  const serial =
    meta.serial_number || meta.sn || meta.serial || machine.serial_number || null;

  const aiState = meta.ai_state && typeof meta.ai_state === "object" ? meta.ai_state : null;
  const aiStatus =
    aiState?.severity != null
      ? String(aiState.severity)
      : aiState?.active_profile || null;

  const remainingRuntime =
    meta.remaining_useful_life ??
    meta.rul ??
    meta.remaining_runtime ??
    null;

  const score =
    integration?.integration_score != null
      ? `${Math.round(integration.integration_score)}%`
      : null;

  const criticalBg = machineCriticalityColor?.[machine.criticality];

  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-[#141820] overflow-hidden transition hover:border-emerald-500/30">
      <div className="relative h-28 bg-[#1a1f27] border-b border-white/5">
        {photo ? (
          <img
            src={photo}
            alt={machine.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
            Kein Foto · —
          </div>
        )}
        <span
          className={`absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusTone(
            machine.status
          )}`}
        >
          {statusLabel(machine.status)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-50">
              {machine.name || "—"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {machine.location || "Kein Standort"}
            </p>
          </div>
          {machine.criticality ? (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] text-white/90"
              style={{ backgroundColor: criticalBg || "#475569" }}
            >
              {criticalityLabel(machine.criticality)}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Seriennr. (SN)" value={serial} muted={!serial} />
          <Field
            label="Sensoren"
            value={sensorCount > 0 ? sensorCount : null}
            source="LIVE"
            muted={sensorCount <= 0}
          />
          <Field
            label="Integration"
            value={score}
            source="DERIVED"
            muted={!score}
          />
          <Field
            label="Verbunden / getrennt"
            value={statusLabel(machine.status)}
            source="LIVE"
          />
          <Field
            label="KI-Status"
            value={aiStatus}
            source="LIVE"
            muted={!aiStatus}
          />
          <Field
            label="Restlaufzeit"
            value={
              remainingRuntime != null ? `${remainingRuntime}` : null
            }
            source="LIVE"
            muted={remainingRuntime == null}
          />
        </div>

        {machine.description ? (
          <p className="line-clamp-2 text-xs text-slate-500">{machine.description}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setSelectedMachine(machine);
              setIsEditing(true);
            }}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
          >
            {t("edit")}
          </button>
          <Link
            to={`/sensor`}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200"
          >
            Sensoren
          </Link>
          <Link
            to="/production-run"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
          >
            Aktueller Auftrag
          </Link>
        </div>
      </div>
    </article>
  );
}
