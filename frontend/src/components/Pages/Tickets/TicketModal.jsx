import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "assigned", "in_progress", "resolved", "cancelled"];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm text-slate-100";

/**
 * Create / edit ticket modal — priority, owner, status, estimated downtime cost.
 */
export default function TicketModal({
  open,
  onClose,
  onSave,
  ticket = null,
  isEditing = false,
  isLoading = false,
  machines = [],
  alarms = [],
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    machine_id: "",
    alarm_id: "",
    title: "",
    description: "",
    priority: "medium",
    status: "open",
    assignee: "",
    due_at: "",
    estimated_downtime_cost: "",
    resolution_notes: "",
    auto_created: false,
  });

  useEffect(() => {
    if (!open) return;
    if (ticket && isEditing) {
      setForm({
        machine_id: ticket.machine_id || "",
        alarm_id: ticket.alarm_id || "",
        title: ticket.title || "",
        description: ticket.description || "",
        priority: ticket.priority || "medium",
        status: ticket.status || "open",
        assignee: ticket.assignee || "",
        due_at: ticket.due_at ? String(ticket.due_at).slice(0, 10) : "",
        estimated_downtime_cost:
          ticket.estimated_downtime_cost != null
            ? String(ticket.estimated_downtime_cost)
            : "",
        resolution_notes: ticket.resolution_notes || "",
        auto_created: Boolean(ticket.auto_created),
      });
    } else {
      setForm({
        machine_id: machines[0]?.id || "",
        alarm_id: "",
        title: "",
        description: "",
        priority: "medium",
        status: "open",
        assignee: "",
        due_at: "",
        estimated_downtime_cost: "",
        resolution_notes: "",
        auto_created: false,
      });
    }
  }, [open, ticket, isEditing, machines]);

  if (!open) return null;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.machine_id) return;

    const costRaw = String(form.estimated_downtime_cost || "").trim();
    const cost =
      costRaw === "" ? null : Number.isFinite(Number(costRaw)) ? Number(costRaw) : null;

    if (isEditing) {
      onSave({
        title: form.title.trim(),
        priority: form.priority,
        status: form.status,
        assignee: form.assignee.trim() || null,
        description: form.description.trim() || null,
        due_at: form.due_at ? `${form.due_at}T00:00:00Z` : null,
        estimated_downtime_cost: cost,
        resolution_notes: form.resolution_notes.trim() || null,
      });
      return;
    }

    onSave({
      machine_id: form.machine_id,
      alarm_id: form.alarm_id || null,
      title: form.title.trim(),
      priority: form.priority,
      assignee: form.assignee.trim() || null,
      description: form.description.trim() || null,
      due_at: form.due_at ? `${form.due_at}T00:00:00Z` : null,
      estimated_downtime_cost: cost,
      auto_created: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#141820] p-5 text-slate-100 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-50">
          {isEditing ? t("tickets.modal.edit") : t("tickets.modal.create")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              {t("tickets.modal.title")} *
            </label>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              {t("tickets.modal.machine")} *
            </label>
            <select
              className={inputClass}
              value={form.machine_id}
              onChange={(e) => set("machine_id", e.target.value)}
              required
              disabled={isLoading || isEditing}
            >
              <option value="">{t("tickets.modal.selectMachine")}</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))}
            </select>
          </div>

          {alarms.length > 0 && !isEditing ? (
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                {t("tickets.modal.relatedAlarm")}
              </label>
              <select
                className={inputClass}
                value={form.alarm_id}
                onChange={(e) => set("alarm_id", e.target.value)}
                disabled={isLoading}
              >
                <option value="">{t("tickets.modal.none")}</option>
                {alarms.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.message || a.id).slice(0, 80)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              {t("tickets.modal.description")}
            </label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                {t("tickets.modal.priority")}
              </label>
              <select
                className={inputClass}
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                disabled={isLoading}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {t(`tickets.priority.${p}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                {t("tickets.modal.status")}
              </label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                disabled={isLoading || !isEditing}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`tickets.status.${s}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                {t("tickets.modal.owner")}
              </label>
              <input
                className={inputClass}
                value={form.assignee}
                onChange={(e) => set("assignee", e.target.value)}
                placeholder={t("tickets.modal.ownerPlaceholder")}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                {t("tickets.modal.dueDate")}
              </label>
              <input
                type="date"
                className={inputClass}
                value={form.due_at}
                onChange={(e) => set("due_at", e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              {t("tickets.modal.downtimeCost")}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={form.estimated_downtime_cost}
              onChange={(e) => set("estimated_downtime_cost", e.target.value)}
              placeholder={t("tickets.modal.downtimeCostPlaceholder")}
              disabled={isLoading}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              {t("tickets.modal.downtimeCostHint")}
            </p>
          </div>

          {isEditing ? (
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                {t("tickets.modal.resolutionNotes")}
              </label>
              <textarea
                className={inputClass}
                rows={2}
                value={form.resolution_notes}
                onChange={(e) => set("resolution_notes", e.target.value)}
                disabled={isLoading}
              />
            </div>
          ) : null}

          <div className="mt-4 flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLoading ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
