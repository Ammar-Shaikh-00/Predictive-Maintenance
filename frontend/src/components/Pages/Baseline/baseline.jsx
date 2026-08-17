import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import safeApi from "../../../api/safeApi";
import { useErrorToast } from "../../subComponents/errorToast";
import BaselineModal from "./baseModal";
import BaselineCard from "./baslineCard";

/**
 * Module 13 — Baseline Manager (production-ready).
 * Gold-standard / reference run windows by machine state + sensors.
 * Reuses /baselines/baseline-maps. No AI inventing.
 */
export default function Baseline() {
  const { t } = useTranslation();
  const { ErrorComponent } = useErrorToast();

  const [baselines, setBaselines] = useState([]);
  const [machineStates, setMachineStates] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBaseline, setSelectedBaseline] = useState(null);

  const stateNameById = useMemo(() => {
    const map = {};
    for (const s of machineStates || []) {
      map[String(s.id)] = s.name || s.state_name || s.label || `Status ${s.id}`;
    }
    return map;
  }, [machineStates]);

  const load = useCallback(async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    setError(null);
    try {
      const [b, ms, s] = await Promise.all([
        safeApi.get("/baselines/baseline-maps"),
        safeApi.get("/machine-state/default-machine-states"),
        safeApi.get("/default-sensors"),
      ]);

      if (b?.fallback) {
        setError(b.error || "Basislinien konnten nicht geladen werden");
        setBaselines([]);
      } else {
        setBaselines(Array.isArray(b?.data) ? b.data : []);
      }

      if (!ms?.fallback) {
        setMachineStates(Array.isArray(ms?.data) ? ms.data : []);
      }
      if (!s?.fallback) {
        setSensors(Array.isArray(s?.data) ? s.data : []);
      } else {
        const live = await safeApi.get("/sensors");
        setSensors(Array.isArray(live?.data) ? live.data : []);
      }
    } catch (err) {
      setError(err?.message || t("messages.load_failed"));
      setBaselines([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load({ soft: false });
  }, [load]);

  const createMutation = useMutation({
    mutationFn: (data) => safeApi.post("/baselines/baseline-maps", data),
    onSuccess: async (res) => {
      if (res?.fallback) {
        toast.error(res.error || t("messages.load_failed"));
        return;
      }
      toast.success(t("messages.created"));
      setShowModal(false);
      setSelectedBaseline(null);
      setIsEditing(false);
      await load({ soft: true });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || err?.message || "Erstellung fehlgeschlagen");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) =>
      safeApi.put(`/baselines/baseline-maps/${data.id}`, data),
    onSuccess: async (res) => {
      if (res?.fallback) {
        toast.error(res.error || "Aktualisierung fehlgeschlagen");
        return;
      }
      toast.success(t("messages.updated"));
      setShowModal(false);
      setSelectedBaseline(null);
      setIsEditing(false);
      await load({ soft: true });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || err?.message || "Aktualisierung fehlgeschlagen");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => safeApi.delete(`/baselines/baseline-maps/${id}`),
    onSuccess: (_, id) => {
      setBaselines((prev) => prev.filter((b) => b.id !== id));
      toast.success(t("messages.deleted") || "Gelöscht");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || err?.message || "Löschen fehlgeschlagen");
    },
  });

  const totalMappings = useMemo(() => {
    let n = 0;
    for (const b of baselines) {
      for (const st of b.mappings || []) {
        n += (st.mappings || []).length;
      }
    }
    return n;
  }, [baselines]);

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Modul 13
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              {t("baseline.title") || "Basislinien-Manager"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {t("baseline.description") ||
                "Goldstandard-Sensorfenster pro Maschinenstatus — Referenz für Live-Abweichungen"}
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
              to="/live-deviations"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Live-Abweichungen
            </Link>
            <Link
              to="/material"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Materialprofile
            </Link>
            <button
              type="button"
              onClick={() => load({ soft: true })}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Aktualisieren
            </button>
            <button
              type="button"
              onClick={() => {
                setShowModal(true);
                setIsEditing(false);
                setSelectedBaseline(null);
              }}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
            >
              + {t("baseline.create") || "Erstellen"}
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Basislinien", baselines.length],
          ["Maschinenstatus", machineStates.length],
          ["Sensoren", sensors.length],
          ["Sensorzuordnungen", totalMappings],
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

      {loading && baselines.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          {t("common.loading") || "Wird geladen…"}
        </p>
      ) : baselines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#141820] px-4 py-10 text-center">
          <p className="text-sm text-slate-300">
            {t("baseline.no_data") || "Noch keine Basislinien"}
          </p>
          <button
            type="button"
            onClick={() => {
              setShowModal(true);
              setIsEditing(false);
            }}
            className="mt-3 text-xs text-emerald-300 underline"
          >
            + {t("baseline.create") || "Erstellen"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {baselines.map((b) => (
            <BaselineCard
              key={b.id}
              baseline={b}
              stateNameById={stateNameById}
              deleteMutation={deleteMutation}
              onEdit={(baseline) => {
                setSelectedBaseline(baseline);
                setIsEditing(true);
                setShowModal(true);
              }}
            />
          ))}
        </div>
      )}

      <BaselineModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setIsEditing(false);
          setSelectedBaseline(null);
        }}
        onSave={(data) => {
          if (isEditing && selectedBaseline) {
            updateMutation.mutate({ ...data, id: selectedBaseline.id });
          } else {
            createMutation.mutate(data);
          }
        }}
        machineStates={machineStates}
        sensors={sensors}
        isLoading={createMutation.isPending || updateMutation.isPending}
        baseline={selectedBaseline}
        isEditing={isEditing}
      />

      {ErrorComponent}
    </div>
  );
}
