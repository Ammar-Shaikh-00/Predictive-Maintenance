import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import safeApi from "../../../api/safeApi";
import ProvenanceBadge from "../OperationsCenter/components/ProvenanceBadge";
import TicketModal from "./TicketModal";

const POLL_MS = 30000;
const OPEN_STATUSES = new Set(["open", "assigned", "in_progress"]);

function priorityClass(priority) {
  const p = String(priority || "").toLowerCase();
  if (p === "critical") return "border-rose-500/40 bg-rose-500/15 text-rose-200";
  if (p === "high") return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  if (p === "medium") return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  return "border-white/10 bg-white/5 text-slate-300";
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "resolved" || s === "cancelled")
    return "border-slate-500/30 bg-slate-500/10 text-slate-400";
  if (s === "in_progress")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (s === "assigned")
    return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

function formatCost(value, currency = "€") {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${currency}${Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

/**
 * Module 17 — Ticket Center (production-ready).
 * Priority, owner, status, estimated downtime cost.
 * Reuses GET/POST/PATCH /tickets. Never invents downtime cost.
 */
export default function TicketCenterPage() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState([]);
  const [machines, setMachines] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("openish");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selected, setSelected] = useState(null);

  const machineNameById = useMemo(() => {
    const map = {};
    for (const m of machines) {
      map[String(m.id)] = m.name || String(m.id);
    }
    return map;
  }, [machines]);

  const load = useCallback(async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    setError(null);
    try {
      const [ticketRes, machineRes, alarmRes] = await Promise.all([
        safeApi.get("/tickets"),
        safeApi.get("/machines"),
        safeApi.get("/alarms?status=active"),
      ]);

      if (ticketRes?.fallback) {
        setError(ticketRes.error || t("tickets.loadFailed"));
        if (!soft) setTickets([]);
      } else {
        setTickets(Array.isArray(ticketRes?.data) ? ticketRes.data : []);
      }

      if (!machineRes?.fallback) {
        setMachines(Array.isArray(machineRes?.data) ? machineRes.data : []);
      }
      if (!alarmRes?.fallback) {
        setAlarms(Array.isArray(alarmRes?.data) ? alarmRes.data : []);
      }
    } catch (err) {
      setError(err?.message || t("tickets.loadFailed"));
      if (!soft) setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load({ soft: false });
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load({ soft: true }), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const createMutation = useMutation({
    mutationFn: (data) => safeApi.post("/tickets", data),
    onSuccess: async (res) => {
      if (res?.fallback) {
        toast.error(res.error || t("tickets.toast.createFailed"));
        return;
      }
      toast.success(t("tickets.toast.created"));
      setShowModal(false);
      await load({ soft: true });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.detail || err?.message || t("tickets.toast.createFailed")
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => safeApi.patch(`/tickets/${id}`, data),
    onSuccess: async (res) => {
      if (res?.fallback) {
        toast.error(res.error || t("tickets.toast.updateFailed"));
        return;
      }
      toast.success(t("tickets.toast.updated"));
      setShowModal(false);
      setIsEditing(false);
      setSelected(null);
      await load({ soft: true });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.detail || err?.message || t("tickets.toast.updateFailed")
      );
    },
  });

  const filtered = useMemo(() => {
    return tickets.filter((tk) => {
      const st = String(tk.status || "").toLowerCase();
      const pr = String(tk.priority || "").toLowerCase();
      if (statusFilter === "openish" && !OPEN_STATUSES.has(st)) return false;
      if (statusFilter !== "all" && statusFilter !== "openish" && st !== statusFilter)
        return false;
      if (priorityFilter !== "all" && pr !== priorityFilter) return false;
      return true;
    });
  }, [tickets, statusFilter, priorityFilter]);

  const kpis = useMemo(() => {
    let open = 0;
    let critical = 0;
    let unassigned = 0;
    let costSum = 0;
    let costKnown = 0;
    for (const tk of tickets) {
      const st = String(tk.status || "").toLowerCase();
      if (OPEN_STATUSES.has(st)) open += 1;
      if (String(tk.priority || "").toLowerCase() === "critical" && OPEN_STATUSES.has(st))
        critical += 1;
      if (OPEN_STATUSES.has(st) && !tk.assignee) unassigned += 1;
      if (tk.estimated_downtime_cost != null && Number.isFinite(Number(tk.estimated_downtime_cost))) {
        costSum += Number(tk.estimated_downtime_cost);
        costKnown += 1;
      }
    }
    return { open, critical, unassigned, costSum, costKnown, total: tickets.length };
  }, [tickets]);

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Module 17
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              {t("tickets.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-400">{t("tickets.description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              ← Betriebszentrale
            </Link>
            <Link
              to="/maintenance-history"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              {t("tickets.maintenance")}
            </Link>
            <button
              type="button"
              onClick={() => load({ soft: true })}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("common.refresh", { defaultValue: "Aktualisieren" })}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowModal(true);
                setIsEditing(false);
                setSelected(null);
              }}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
            >
              + {t("tickets.create")}
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          [t("tickets.kpi.open"), kpis.open, "text-amber-300"],
          [t("tickets.kpi.critical"), kpis.critical, "text-rose-300"],
          [t("tickets.kpi.unassigned"), kpis.unassigned, "text-sky-300"],
          [
            t("tickets.kpi.downtimeCost"),
            kpis.costKnown > 0 ? formatCost(kpis.costSum) : "—",
            "text-emerald-300",
          ],
          [t("tickets.kpi.total"), kpis.total, "text-slate-200"],
        ].map(([label, value, tone]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-[#141820] px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#141820] px-3 py-1.5 text-xs text-slate-200"
        >
          <option value="openish">{t("tickets.filters.activeOpen")}</option>
          <option value="all">{t("tickets.filters.allStatuses")}</option>
          <option value="open">{t("tickets.status.open")}</option>
          <option value="assigned">{t("tickets.status.assigned")}</option>
          <option value="in_progress">{t("tickets.status.in_progress")}</option>
          <option value="resolved">{t("tickets.status.resolved")}</option>
          <option value="cancelled">{t("tickets.status.cancelled")}</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#141820] px-3 py-1.5 text-xs text-slate-200"
        >
          <option value="all">{t("tickets.filters.allPriorities")}</option>
          <option value="critical">{t("tickets.priority.critical")}</option>
          <option value="high">{t("tickets.priority.high")}</option>
          <option value="medium">{t("tickets.priority.medium")}</option>
          <option value="low">{t("tickets.priority.low")}</option>
        </select>
      </div>

      {loading && tickets.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#141820] px-4 py-10 text-center">
          <p className="text-sm text-slate-300">{t("tickets.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tk) => (
            <article
              key={tk.id}
              className="rounded-2xl border border-white/10 bg-[#141820] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <ProvenanceBadge
                      source={tk.auto_created ? "RULE_BASED" : "MANUAL"}
                      label={
                        tk.auto_created
                          ? t("tickets.provenance.auto")
                          : t("tickets.provenance.manual")
                      }
                    />
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${priorityClass(
                        tk.priority
                      )}`}
                    >
                      {t(`tickets.priority.${tk.priority}`, {
                        defaultValue: tk.priority,
                      })}
                    </span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusClass(
                        tk.status
                      )}`}
                    >
                      {t(`tickets.status.${tk.status}`, {
                        defaultValue: tk.status,
                      })}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-50">{tk.title}</h2>
                  {tk.description ? (
                    <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                      {tk.description}
                    </p>
                  ) : null}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        {t("tickets.fields.machine")}
                      </p>
                      <p className="mt-0.5 text-slate-200">
                        {machineNameById[String(tk.machine_id)] || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        {t("tickets.fields.owner")}
                      </p>
                      <p className="mt-0.5 text-slate-200">{tk.assignee || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        {t("tickets.fields.downtimeCost")}
                      </p>
                      <p className="mt-0.5 font-medium text-emerald-300">
                        {formatCost(tk.estimated_downtime_cost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        {t("tickets.fields.created")}
                      </p>
                      <p className="mt-0.5 text-slate-200">
                        {formatWhen(tk.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(tk);
                    setIsEditing(true);
                    setShowModal(true);
                  }}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                >
                  {t("common.edit")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <TicketModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setIsEditing(false);
          setSelected(null);
        }}
        onSave={(data) => {
          if (isEditing && selected) {
            updateMutation.mutate({ id: selected.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        ticket={selected}
        isEditing={isEditing}
        isLoading={saving}
        machines={machines}
        alarms={alarms}
      />
    </div>
  );
}
