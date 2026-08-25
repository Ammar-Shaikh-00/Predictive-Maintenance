import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import MachineCard from "./machineCard";
import { MachineModal } from "./machineModal";
import safeApi from "../../../api/safeApi";
import { useErrorToast } from "../../subComponents/errorToast";

const COMPANY_ID = "default";

/**
 * Module 10 — Machine Overview (production-ready card grid).
 * Reuses GET /machines + optional machine-integrations. Never invents AI/RUL.
 */
export default function Machine() {
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const { showError, ErrorComponent } = useErrorToast();

  const [machines, setMachines] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [sensorCounts, setSensorCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [machRes, integRes, sensRes] = await Promise.all([
        safeApi.get("/machines"),
        safeApi.get(
          `/operations-hardening/machine-integrations?company_id=${COMPANY_ID}`
        ),
        safeApi.get("/sensors"),
      ]);

      if (machRes?.fallback) {
        setError(machRes.error || "Maschinen konnten nicht geladen werden");
        setMachines([]);
      } else {
        setMachines(Array.isArray(machRes?.data) ? machRes.data : []);
      }

      if (!integRes?.fallback) {
        const rows = Array.isArray(integRes?.data)
          ? integRes.data
          : integRes?.data?.rows || [];
        setIntegrations(rows);
      }

      if (!sensRes?.fallback && Array.isArray(sensRes?.data)) {
        const counts = {};
        for (const s of sensRes.data) {
          const mid = String(s.machine_id || "");
          if (!mid) continue;
          counts[mid] = (counts[mid] || 0) + 1;
        }
        setSensorCounts(counts);
      }
    } catch (err) {
      setError(err?.message || "Fehler beim Laden der Maschinen");
      setMachines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const integrationByMachine = useMemo(() => {
    const map = {};
    for (const row of integrations || []) {
      if (row?.machine_id) map[String(row.machine_id)] = row;
    }
    return map;
  }, [integrations]);

  const deleteMutation = useMutation({
    mutationFn: (id) => safeApi.delete(`/machines/${String(id)}`),
    onSuccess: (_, id) => {
      setMachines((prev) => prev.filter((m) => m.id !== id));
      showError("✅ Maschine erfolgreich gelöscht!");
    },
    onError: (error) => {
      showError(
        `❌ Maschine konnte nicht gelöscht werden: ${
          error.response?.data?.detail || error.message || "Unbekannter Fehler"
        }`
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => safeApi.put(`/machines/${id}`, data),
    onSuccess: (res, variables) => {
      if (res?.fallback) {
        showError(res?.error || "Maschine konnte nicht aktualisiert werden");
        return;
      }
      setMachines((prev) =>
        prev.map((m) =>
          m.id === variables.id ? { ...m, ...variables.data, ...(res.data || {}) } : m
        )
      );
      setIsEditing(false);
      setSelectedMachine(null);
      toast.success("Maschine erfolgreich aktualisiert");
    },
    onError: (error) => {
      showError(
        `❌ Maschine konnte nicht aktualisiert werden: ${
          error.response?.data?.detail || error.message
        }`
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => safeApi.post("/machines", data),
    onSuccess: (res) => {
      if (res?.data) setMachines((prev) => [...prev, res.data]);
      setShowCreateModal(false);
      showError("✅ Maschine erfolgreich erstellt!");
    },
    onError: (error) => {
      showError(
        `❌ Maschine konnte nicht erstellt werden: ${
          error.response?.data?.detail || error.message
        }`
      );
    },
  });

  const onlineCount = machines.filter(
    (m) => String(m.status || "").toLowerCase() === "online"
  ).length;

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Module 10
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              Maschinenübersicht
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Karten je Maschine — Status, Standort, Sensoren und Integration.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              ← Betriebszentrale
            </Link>
            <Link
              to="/sensor"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Sensoren
            </Link>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Aktualisieren
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
            >
              + {t("addMachine")}
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Maschinen", machines.length],
          ["Verbunden", onlineCount],
          ["Getrennt / sonstige", Math.max(0, machines.length - onlineCount)],
          [
            "Mit Integration",
            machines.filter((m) => integrationByMachine[String(m.id)]).length,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-[#141820] px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">
          {t("loadingMachines")}
        </p>
      ) : machines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#141820] px-4 py-10 text-center">
          <p className="text-sm text-slate-300">{t("noMachines")}</p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-3 text-xs text-emerald-300 underline"
          >
            + {t("addMachine")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {machines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              integration={integrationByMachine[String(machine.id)]}
              sensorCount={sensorCounts[String(machine.id)] || 0}
              deleteMutation={deleteMutation}
              setSelectedMachine={setSelectedMachine}
              setIsEditing={setIsEditing}
            />
          ))}
        </div>
      )}

      <MachineModal
        isOpen={showCreateModal || isEditing}
        onClose={() => {
          setShowCreateModal(false);
          setIsEditing(false);
          setSelectedMachine(null);
        }}
        onSave={(data) => {
          if (isEditing && selectedMachine) {
            updateMutation.mutate({ id: selectedMachine.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        machine={selectedMachine}
        isEditing={isEditing}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {ErrorComponent}
    </div>
  );
}
