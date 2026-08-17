import { useTranslation } from "react-i18next";

function Field({ label, value }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-medium ${empty ? "text-slate-500" : "text-slate-100"}`}>
        {empty ? "—" : String(value)}
      </p>
    </div>
  );
}

/**
 * Module 13 baseline card — reference windows by machine state.
 */
export default function BaselineCard({
  baseline,
  stateNameById = {},
  onEdit,
  deleteMutation,
}) {
  const { t } = useTranslation();
  const mappings = Array.isArray(baseline?.mappings) ? baseline.mappings : [];
  const stateCount = mappings.length;
  const sensorMapCount = mappings.reduce(
    (sum, st) => sum + (st.mappings?.length || 0),
    0
  );

  const statePreview = mappings
    .slice(0, 4)
    .map((st) => {
      const name =
        stateNameById[String(st.machine_state_id)] ||
        `Status ${st.machine_state_id}`;
      const n = st.mappings?.length || 0;
      return `${name} (${n})`;
    })
    .join(" · ");

  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-[#141820] p-4 transition hover:border-emerald-500/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-50">
            {baseline.baseline_name || "—"}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("baseline.id") || "ID"}: {baseline.id}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
          LIVE
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Maschinenstatus" value={stateCount || null} />
        <Field label="Sensorzuordnungen" value={sensorMapCount || null} />
      </div>

      <p className="mt-3 line-clamp-3 text-xs text-slate-400">
        {statePreview || "Noch keine Statuszuordnungen"}
        {mappings.length > 4 ? " …" : ""}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(baseline)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
        >
          {t("common.edit") || "Bearbeiten"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                `Basislinie „${baseline.baseline_name || baseline.id}“ löschen?`
              )
            ) {
              deleteMutation.mutate(baseline.id);
            }
          }}
          disabled={deleteMutation?.isPending}
          className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
        >
          {t("common.delete") || "Löschen"}
        </button>
      </div>
    </article>
  );
}
