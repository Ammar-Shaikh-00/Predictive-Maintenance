import { useState } from "react";
import { Edit3, Factory, Save, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import safeApi from "../../../api/safeApi";

const contextFields = [
  { name: "product_name", labelKey: "productionRun.context.fields.product" },
  { name: "product_code", labelKey: "productionRun.context.fields.productCode" },
  { name: "customer_order", labelKey: "productionRun.context.fields.customerOrder" },
  { name: "batch_no", labelKey: "productionRun.context.fields.batch" },
  { name: "material_type", labelKey: "productionRun.context.fields.materialType" },
  { name: "material_grade", labelKey: "productionRun.context.fields.materialGrade" },
  { name: "supplier", labelKey: "productionRun.context.fields.supplier" },
  { name: "silo_path", labelKey: "productionRun.context.fields.siloHopper" },
];

const InfoRow = ({ label, value }) => (
  <div className="grid grid-cols-[140px_1fr] gap-3">
    <div className="text-slate-400">{label}</div>
    <div className="font-medium text-slate-100">{value || "--"}</div>
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

export default function ContextOverview({ runData, editable, onRunUpdate }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(runData || {});

  const startEdit = () => {
    setForm(runData || {});
    setEditing(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await safeApi.put(`/production-run/${form.id}`, form);
      onRunUpdate(res.data);
      setEditing(false);
      toast.success(t("productionRun.context.messages.saved"));
    } catch (error) {
      console.error(error);
      toast.error(t("productionRun.context.messages.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-[#12161e] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{t("productionRun.context.title")}</h2>

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

      {!editable && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
          {t("productionRun.context.readOnly")}
        </div>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_180px]">
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {contextFields.map((field) => (
              <EditInput
                key={field.name}
                field={field}
                value={form[field.name]}
                onChange={handleChange}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <InfoRow label={t("productionRun.context.fields.product")} value={runData.product_name} />
            <InfoRow label={t("productionRun.context.fields.batch")} value={runData.batch_no} />
            <InfoRow
              label={t("productionRun.context.fields.material")}
              value={[runData.material_type, runData.material_grade].filter(Boolean).join(" - ") || runData.material_name}
            />
            <InfoRow label={t("productionRun.context.fields.supplier")} value={runData.supplier} />
            <InfoRow label={t("productionRun.context.fields.siloHopper")} value={runData.silo_path} />
            <InfoRow label={t("productionRun.context.fields.customerOrder")} value={runData.customer_order} />
          </div>
        )}

        <div className="flex min-h-36 items-center justify-center rounded-xl border border-white/10 bg-[#1a1f27] text-emerald-400">
          <Factory size={74} strokeWidth={1.4} />
        </div>
      </div>

      {editing && (
        <div className="mt-5 flex justify-end gap-2">
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
            {saving ? t("productionRun.actions.saving") : t("productionRun.context.actions.save")}
          </button>
        </div>
      )}
    </section>
  );
}
