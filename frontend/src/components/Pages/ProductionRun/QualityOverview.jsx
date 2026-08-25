import { useState } from "react";
import { Edit3, Save, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import safeApi from "../../../api/safeApi";
import { formatDateTime, getStatusTone, numberOrDash } from "./productionRunUtils";

const qualityFields = [
  { name: "quality_status", labelKey: "productionRun.quality.fields.qualityStatus" },
  { name: "scrap_amount", labelKey: "productionRun.quality.fields.scrapAmount" },
  { name: "scrap_percentage", labelKey: "productionRun.quality.fields.scrapPercent" },
  { name: "defect_type", labelKey: "productionRun.quality.fields.defectType" },
  { name: "defect_description", labelKey: "productionRun.quality.fields.defectDescription" },
  { name: "customer_complaint_reference", labelKey: "productionRun.quality.fields.customerComplaintRef" },
  { name: "internal_qc_result", labelKey: "productionRun.quality.fields.internalQcResult" },
  { name: "lab_result", labelKey: "productionRun.quality.fields.labResult" },
];

const qualityFlags = [
  { name: "visual_defect_flag", labelKey: "productionRun.quality.flags.visualDefect" },
  { name: "dimensional_issue_flag", labelKey: "productionRun.quality.flags.dimensionalIssue" },
  { name: "surface_issue_flag", labelKey: "productionRun.quality.flags.surfaceIssue" },
  { name: "color_deviation_flag", labelKey: "productionRun.quality.flags.colorDeviation" },
  { name: "density_weight_issue_flag", labelKey: "productionRun.quality.flags.densityWeightIssue" },
  { name: "rework_flag", labelKey: "productionRun.quality.flags.rework" },
  { name: "downgrade_flag", labelKey: "productionRun.quality.flags.downgrade" },
  { name: "shift_issue_flag", labelKey: "productionRun.quality.flags.shiftIssue" },
  { name: "changeover_issue_flag", labelKey: "productionRun.quality.flags.changeoverIssue" },
  { name: "stop_start_instability_flag", labelKey: "productionRun.quality.flags.stopStartInstability" },
];

const InfoBlock = ({ label, value }) => (
  <div>
    <div className="text-sm text-slate-400">{label}</div>
    <div className="mt-1 font-semibold text-slate-100">{value || "--"}</div>
  </div>
);

const EditInput = ({ field, value, onChange, t }) => (
  <div className="flex flex-col">
    <label className="mb-1 text-xs font-semibold text-slate-400">{t(field.labelKey)}</label>
    <input
      name={field.name}
      value={value || ""}
      onChange={onChange}
      className="rounded-lg border border-white/10 bg-[#0b0d11] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-500/20"
    />
  </div>
);

const EditCheckbox = ({ field, checked, onChange, t }) => (
  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1a1f27] px-3 py-2 text-sm text-slate-300">
    <input
      type="checkbox"
      name={field.name}
      checked={Boolean(checked)}
      onChange={onChange}
      className="h-4 w-4 accent-emerald-500"
    />
    {t(field.labelKey)}
  </label>
);

export default function QualityOverview({
  runId,
  quality,
  editable,
  expanded = false,
  onQualityUpdate,
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(quality || {});

  const startEdit = () => {
    setForm(quality || {});
    setEditing(true);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await safeApi.put(`/production-run/${runId}/quality`, form);
      onQualityUpdate(res.data || {});
      setEditing(false);
      toast.success(t("productionRun.quality.messages.saved"));
    } catch (error) {
      console.error(error);
      toast.error(t("productionRun.quality.messages.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-[#12161e] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{t("productionRun.quality.title")}</h2>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${getStatusTone(quality.quality_status || "ok")}`}>
            {quality.quality_status || "OK"}
          </span>

          {editable && !editing && (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
            >
              <Edit3 size={15} />
              {t("productionRun.actions.edit")}
            </button>
          )}
        </div>
      </div>

      {!editable && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
          {t("productionRun.quality.readOnly")}
        </div>
      )}

      {editing ? (
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {qualityFields.map((field) => (
              <EditInput
                key={field.name}
                field={field}
                value={form[field.name]}
                onChange={handleChange}
                t={t}
              />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {qualityFlags.map((field) => (
              <EditCheckbox
                key={field.name}
                field={field}
                checked={form[field.name]}
                onChange={handleChange}
                t={t}
              />
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">
              {t("productionRun.quality.fields.notes")}
            </label>
            <textarea
              name="notes"
              value={form.notes || ""}
              onChange={handleChange}
              className="min-h-24 w-full rounded-lg border border-white/10 bg-[#0b0d11] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
            >
              <X size={15} />
              {t("productionRun.actions.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={15} />
              {saving ? t("productionRun.actions.saving") : t("productionRun.quality.actions.save")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-slate-400">{t("productionRun.quality.fields.scrapPercent")}</div>
              <div className="mt-2 text-3xl font-bold text-emerald-400">{numberOrDash(quality.scrap_percentage, 2)} %</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">{t("productionRun.quality.fields.scrapAmount")}</div>
              <div className="mt-2 text-2xl font-bold text-white">{numberOrDash(quality.scrap_amount, 1)} kg</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">{t("productionRun.quality.fields.totalDefects")}</div>
              <div className="mt-2 text-2xl font-bold text-white">{quality.defect_count ?? quality.defects_total ?? "--"}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-3">
            <InfoBlock label={t("productionRun.quality.fields.mainReason")} value={quality.defect_type} />
            <InfoBlock label={t("productionRun.quality.fields.lastQcCheck")} value={formatDateTime(quality.updated_at || quality.last_qc_check)} />
            <InfoBlock label={t("productionRun.quality.fields.internalQc")} value={quality.internal_qc_result} />
          </div>

          {expanded && (
            <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
              {quality.notes || t("productionRun.quality.noNotes")}
            </div>
          )}
        </>
      )}
    </section>
  );
}
