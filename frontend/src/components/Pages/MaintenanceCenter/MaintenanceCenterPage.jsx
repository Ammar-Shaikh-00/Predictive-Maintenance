import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import safeApi from "../../../api/safeApi";
import ProvenanceBadge from "../OperationsCenter/components/ProvenanceBadge";
import { currentMonthKey, groupCalendarByMonth } from "./calendarUtils";

const COMPANY_ID = "default";
const TABS = [
  ["overview", "Overview"],
  ["calendar", "Calendar"],
  ["history", "History"],
  ["planned", "Planned"],
  ["wear", "Wear parts"],
];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm text-slate-100";

function dash(v) {
  if (v == null || v === "") return "—";
  return v;
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function kindTone(kind) {
  if (kind === "history") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (kind === "planned") return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  if (kind === "wear") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-white/10 bg-white/5 text-slate-300";
}

function PlanModal({ open, onClose, onSave, machines, isLoading }) {
  const [form, setForm] = useState({
    title: "",
    machine_id: "",
    component: "",
    planned_at: "",
    status: "planned",
    technician: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: "",
      machine_id: machines[0]?.id || "",
      component: "",
      planned_at: "",
      status: "planned",
      technician: "",
      notes: "",
    });
  }, [open, machines]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        className="w-full max-w-lg space-y-3 rounded-2xl border border-white/10 bg-[#141820] p-5 text-slate-100"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.title.trim()) return;
          onSave({
            company_id: COMPANY_ID,
            title: form.title.trim(),
            machine_id: form.machine_id || null,
            component: form.component.trim() || null,
            planned_at: form.planned_at
              ? `${form.planned_at}T09:00:00Z`
              : null,
            status: form.status,
            technician: form.technician.trim() || null,
            notes: form.notes.trim() || null,
            value_source: "MANUAL",
          });
        }}
      >
        <h2 className="text-lg font-semibold">Plan maintenance</h2>
        <input
          className={inputClass}
          placeholder="Title *"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <select
          className={inputClass}
          value={form.machine_id}
          onChange={(e) => setForm({ ...form, machine_id: e.target.value })}
        >
          <option value="">Machine (optional)</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name || m.id}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            className={inputClass}
            value={form.planned_at}
            onChange={(e) => setForm({ ...form, planned_at: e.target.value })}
          />
          <select
            className={inputClass}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="planned">Planned</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <input
          className={inputClass}
          placeholder="Component"
          value={form.component}
          onChange={(e) => setForm({ ...form, component: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Technician"
          value={form.technician}
          onChange={(e) => setForm({ ...form, technician: e.target.value })}
        />
        <textarea
          className={inputClass}
          rows={2}
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function WearModal({ open, onClose, onSave, machines, isLoading }) {
  const [form, setForm] = useState({
    name: "",
    machine_id: "",
    part_number: "",
    component: "",
    next_replace_at: "",
    quantity_on_hand: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: "",
      machine_id: machines[0]?.id || "",
      part_number: "",
      component: "",
      next_replace_at: "",
      quantity_on_hand: "",
      notes: "",
    });
  }, [open, machines]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        className="w-full max-w-lg space-y-3 rounded-2xl border border-white/10 bg-[#141820] p-5 text-slate-100"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          const qty = String(form.quantity_on_hand || "").trim();
          onSave({
            company_id: COMPANY_ID,
            name: form.name.trim(),
            machine_id: form.machine_id || null,
            part_number: form.part_number.trim() || null,
            component: form.component.trim() || null,
            next_replace_at: form.next_replace_at
              ? `${form.next_replace_at}T09:00:00Z`
              : null,
            quantity_on_hand:
              qty === "" ? null : Number.isFinite(Number(qty)) ? Number(qty) : null,
            notes: form.notes.trim() || null,
            value_source: "MANUAL",
          });
        }}
      >
        <h2 className="text-lg font-semibold">Add wear part</h2>
        <input
          className={inputClass}
          placeholder="Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select
          className={inputClass}
          value={form.machine_id}
          onChange={(e) => setForm({ ...form, machine_id: e.target.value })}
        >
          <option value="">Machine (optional)</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name || m.id}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputClass}
            placeholder="Part number"
            value={form.part_number}
            onChange={(e) => setForm({ ...form, part_number: e.target.value })}
          />
          <input
            type="date"
            className={inputClass}
            value={form.next_replace_at}
            onChange={(e) =>
              setForm({ ...form, next_replace_at: e.target.value })
            }
          />
        </div>
        <input
          className={inputClass}
          placeholder="Component"
          value={form.component}
          onChange={(e) => setForm({ ...form, component: e.target.value })}
        />
        <input
          type="number"
          className={inputClass}
          placeholder="Qty on hand"
          value={form.quantity_on_hand}
          onChange={(e) =>
            setForm({ ...form, quantity_on_hand: e.target.value })
          }
        />
        <textarea
          className={inputClass}
          rows={2}
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Module 18 — Maintenance Center (production-ready).
 * Remaining life / calendar / history / planned / wear parts.
 * Never invents RUL — shows — until predictions provide it.
 */
export default function MaintenanceCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const setTab = (next) => {
    const p = new URLSearchParams(searchParams);
    p.set("tab", next);
    setSearchParams(p, { replace: true });
  };

  const [data, setData] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthKey, setMonthKey] = useState(() => currentMonthKey());
  const [showPlan, setShowPlan] = useState(false);
  const [showWear, setShowWear] = useState(false);

  const load = useCallback(async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    setError(null);
    try {
      const [ov, mach] = await Promise.all([
        safeApi.get(
          `/maintenance-center/overview?company_id=${COMPANY_ID}`
        ),
        safeApi.get("/machines"),
      ]);
      if (ov?.fallback) {
        setError(ov.error || "Could not load Maintenance Center");
        if (!soft) setData(null);
      } else {
        setData(ov?.data || null);
      }
      if (!mach?.fallback) {
        setMachines(Array.isArray(mach?.data) ? mach.data : []);
      }
    } catch (err) {
      setError(err?.message || "Failed to load");
      if (!soft) setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ soft: false });
  }, [load]);

  const planMutation = useMutation({
    mutationFn: (body) => safeApi.post("/maintenance-center/plans", body),
    onSuccess: async (res) => {
      if (res?.fallback) {
        toast.error(res.error || "Create failed");
        return;
      }
      toast.success("Plan created");
      setShowPlan(false);
      await load({ soft: true });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || err?.message || "Create failed"),
  });

  const wearMutation = useMutation({
    mutationFn: (body) => safeApi.post("/maintenance-center/wear-parts", body),
    onSuccess: async (res) => {
      if (res?.fallback) {
        toast.error(res.error || "Create failed");
        return;
      }
      toast.success("Wear part added");
      setShowWear(false);
      await load({ soft: true });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.detail || err?.message || "Create failed"),
  });

  const deletePlan = useMutation({
    mutationFn: (id) => safeApi.delete(`/maintenance-center/plans/${id}`),
    onSuccess: async () => {
      toast.success("Plan removed");
      await load({ soft: true });
    },
  });

  const deleteWear = useMutation({
    mutationFn: (id) => safeApi.delete(`/maintenance-center/wear-parts/${id}`),
    onSuccess: async () => {
      toast.success("Wear part removed");
      await load({ soft: true });
    },
  });

  const kpis = data?.kpis || {};
  const calendarGroups = useMemo(
    () => groupCalendarByMonth(data?.calendar || [], monthKey),
    [data?.calendar, monthKey]
  );

  const machineName = useMemo(() => {
    const map = {};
    for (const m of machines) map[String(m.id)] = m.name || m.id;
    for (const r of data?.remaining_life || []) {
      map[String(r.machine_id)] = r.machine_name || map[String(r.machine_id)];
    }
    return map;
  }, [machines, data?.remaining_life]);

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Module 18
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              Maintenance Center
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Remaining life, calendar, history, planned work, wear parts — RUL
              shows — until a model provides it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              ← Operations Center
            </Link>
            <Link
              to="/ticket"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Tickets
            </Link>
            <button
              type="button"
              onClick={() => load({ soft: true })}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["History events", kpis.history_count ?? 0, "text-emerald-300"],
          ["Open planned", kpis.planned_open ?? 0, "text-sky-300"],
          ["Wear parts", kpis.wear_parts ?? 0, "text-amber-300"],
          ["RUL available", kpis.rul_available ?? 0, "text-violet-300"],
          ["Machines", kpis.machines ?? 0, "text-slate-200"],
        ].map(([label, value, tone]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-[#141820] px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-3 py-1.5 text-xs ${
              tab === id
                ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40"
                : "text-slate-400 hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
      ) : null}

      {tab === "overview" && data ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#141820] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Remaining life
              </h2>
              <ProvenanceBadge source="MODEL_PREDICTION" label="Only if provided" />
            </div>
            <ul className="space-y-2">
              {(data.remaining_life || []).map((row) => (
                <li
                  key={row.machine_id}
                  className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2"
                >
                  <span className="text-sm text-slate-200">
                    {row.machine_name || row.machine_id}
                  </span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      row.available ? "text-emerald-300" : "text-slate-500"
                    }`}
                  >
                    {row.available
                      ? `${row.remaining_useful_life} days`
                      : "—"}
                  </span>
                </li>
              ))}
              {(data.remaining_life || []).length === 0 ? (
                <li className="py-6 text-center text-sm text-slate-500">
                  No machines registered
                </li>
              ) : null}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#141820] p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
              Upcoming (calendar)
            </h2>
            <ul className="space-y-2">
              {(data.calendar || [])
                .filter((e) => e.kind !== "history")
                .slice(0, 8)
                .map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-white/5 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-slate-200">{e.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {e.date} · {machineName[String(e.machine_id)] || "—"}
                      </p>
                    </div>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${kindTone(
                        e.kind
                      )}`}
                    >
                      {e.kind}
                    </span>
                  </li>
                ))}
              {(data.calendar || []).filter((e) => e.kind !== "history")
                .length === 0 ? (
                <li className="py-6 text-center text-sm text-slate-500">
                  No planned or wear dates yet
                </li>
              ) : null}
            </ul>
          </div>
        </section>
      ) : null}

      {tab === "calendar" && data ? (
        <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Calendar
            </h2>
            <input
              type="month"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#0f1218] px-2 py-1 text-xs text-slate-200"
            />
          </div>
          {calendarGroups.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No events in this month
            </p>
          ) : (
            <div className="space-y-3">
              {calendarGroups.map((g) => (
                <div key={g.date}>
                  <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">
                    {g.date}
                  </p>
                  <ul className="space-y-1.5">
                    {g.events.map((e) => (
                      <li
                        key={e.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm"
                      >
                        <span className="text-slate-200">{e.title}</span>
                        <div className="flex items-center gap-2">
                          <ProvenanceBadge source={e.value_source} />
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${kindTone(
                              e.kind
                            )}`}
                          >
                            {e.kind}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "history" && data ? (
        <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              History (imported CMMS)
            </h2>
            <Link
              to="/maintenance-history"
              className="text-xs text-emerald-300 hover:underline"
            >
              Classic history table →
            </Link>
          </div>
          {(data.history || []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No imported maintenance events — connect CMMS in Setup Wizard
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="py-2 text-left">When</th>
                    <th className="py-2 text-left">Machine</th>
                    <th className="py-2 text-left">Work order</th>
                    <th className="py-2 text-left">Component</th>
                    <th className="py-2 text-left">Action</th>
                    <th className="py-2 text-left">Tech</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((row) => (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="py-2 text-slate-300">
                        {dash(row.event_at)}
                      </td>
                      <td className="py-2 text-slate-200">
                        {machineName[String(row.machine_id)] ||
                          dash(row.machine_id)}
                      </td>
                      <td className="py-2 text-slate-300">
                        {dash(row.work_order)}
                      </td>
                      <td className="py-2 text-slate-300">
                        {dash(row.component)}
                      </td>
                      <td className="py-2 text-slate-200">{dash(row.action)}</td>
                      <td className="py-2 text-slate-400">
                        {dash(row.technician)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === "planned" && data ? (
        <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Planned maintenance
            </h2>
            <button
              type="button"
              onClick={() => setShowPlan(true)}
              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
            >
              + Plan work
            </button>
          </div>
          {(data.planned || []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No planned work yet
            </p>
          ) : (
            <ul className="space-y-2">
              {data.planned.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-white/5 px-3 py-3"
                >
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <ProvenanceBadge source={p.value_source || "MANUAL"} />
                      <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] uppercase text-sky-200">
                        {p.status}
                      </span>
                    </div>
                    <p className="font-medium text-slate-50">{p.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatWhen(p.planned_at)} ·{" "}
                      {machineName[String(p.machine_id)] || "—"} ·{" "}
                      {dash(p.component)} · {dash(p.technician)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deletePlan.mutate(p.id)}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-400 hover:bg-white/5"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "wear" && data ? (
        <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Wear parts
            </h2>
            <button
              type="button"
              onClick={() => setShowWear(true)}
              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
            >
              + Add part
            </button>
          </div>
          {(data.wear_parts || []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No wear parts registered
            </p>
          ) : (
            <ul className="space-y-2">
              {data.wear_parts.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-white/5 px-3 py-3"
                >
                  <div>
                    <div className="mb-1">
                      <ProvenanceBadge source={w.value_source || "MANUAL"} />
                    </div>
                    <p className="font-medium text-slate-50">{w.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      PN {dash(w.part_number)} ·{" "}
                      {machineName[String(w.machine_id)] || "—"} · next replace{" "}
                      {formatWhen(w.next_replace_at)} · qty{" "}
                      {dash(w.quantity_on_hand)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteWear.mutate(w.id)}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-400 hover:bg-white/5"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <PlanModal
        open={showPlan}
        onClose={() => setShowPlan(false)}
        onSave={(body) => planMutation.mutate(body)}
        machines={machines}
        isLoading={planMutation.isPending}
      />
      <WearModal
        open={showWear}
        onClose={() => setShowWear(false)}
        onSave={(body) => wearMutation.mutate(body)}
        machines={machines}
        isLoading={wearMutation.isPending}
      />
    </div>
  );
}
