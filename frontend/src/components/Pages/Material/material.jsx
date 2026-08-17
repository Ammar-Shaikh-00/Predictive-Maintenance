import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import MaterialCard from "./materialCard";
import MaterialForm from "./materialForm";
import safeApi from "../../../api/safeApi";

/**
 * Module 12 — Material Profiles (production-ready).
 * Real thresholds from /material-profiles. Energy/scrap/optima show — until connected.
 * No AI/ML inventing. Keep create / edit / toggle / delete.
 */
export default function MaterialProfiles() {
  const [materials, setMaterials] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    setError(null);
    try {
      const [sensorRes, materialRes] = await Promise.all([
        safeApi.get("/default-sensors"),
        safeApi.get("/material-profiles"),
      ]);

      if (sensorRes?.fallback) {
        // Fall back to live sensors for labels if mapping catalog offline
        const live = await safeApi.get("/sensors");
        setSensors(Array.isArray(live?.data) ? live.data : []);
      } else {
        setSensors(Array.isArray(sensorRes?.data) ? sensorRes.data : []);
      }

      if (materialRes?.fallback) {
        setError(materialRes.error || "Materialprofile konnten nicht geladen werden");
        setMaterials([]);
      } else {
        setMaterials(Array.isArray(materialRes?.data) ? materialRes.data : []);
      }
    } catch (err) {
      setError(err?.message || "Materialprofile konnten nicht geladen werden");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ soft: false });
  }, [load]);

  const handleSave = async (payload) => {
    try {
      if (editingMaterial) {
        const res = await safeApi.put(
          `/material-profiles/${editingMaterial.id}`,
          payload
        );
        if (res?.fallback) {
          setError(res.error || "Aktualisierung fehlgeschlagen");
          return;
        }
        setMaterials((prev) =>
          prev.map((m) => (m.id === editingMaterial.id ? res.data : m))
        );
      } else {
        const res = await safeApi.post("/material-profiles", payload);
        if (res?.fallback) {
          setError(res.error || "Erstellung fehlgeschlagen");
          return;
        }
        setMaterials((prev) => [...prev, res.data]);
      }
      setShowForm(false);
      setEditingMaterial(null);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Speichern fehlgeschlagen");
    }
  };

  const toggleActive = async (material) => {
    try {
      const res = await safeApi.patch(
        `/material-profiles/${material.id}/toggle`
      );
      if (res?.fallback) {
        setError(res.error || "Umschalten fehlgeschlagen");
        return;
      }
      // API may deactivate others when activating one — soft reload list
      await load({ soft: true });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Umschalten fehlgeschlagen");
    }
  };

  const handleDelete = async (material) => {
    if (!window.confirm(`Materialprofil „${material.name}“ löschen?`)) return;
    try {
      const res = await safeApi.delete(`/material-profiles/${material.id}`);
      if (res?.fallback) {
        setError(res.error || "Löschen fehlgeschlagen");
        return;
      }
      setMaterials((prev) => prev.filter((m) => m.id !== material.id));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Löschen fehlgeschlagen");
    }
  };

  const activeCount = useMemo(
    () => materials.filter((m) => m?.active).length,
    [materials]
  );

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Modul 12
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              Materialprofile
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Referenz-Sensorfenster pro Material. Energie / Ausschuss / Optima
              zeigen — bis verbunden. Keine erfundenen KI-Einstellungen.
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
              to="/material-batches"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Importierte Chargen
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
                setEditingMaterial(null);
                setShowForm(true);
              }}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
            >
              + Erstellen
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Profile", materials.length],
          ["Aktiv", activeCount],
          ["Inaktiv", Math.max(0, materials.length - activeCount)],
          ["Sensoren im Formular", sensors.length],
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

      <MaterialForm
        showForm={showForm}
        sensors={sensors}
        editingMaterial={editingMaterial}
        onSave={handleSave}
        onClose={() => {
          setShowForm(false);
          setEditingMaterial(null);
        }}
      />

      {loading && materials.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Wird geladen…</p>
      ) : materials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#141820] px-4 py-10 text-center">
          <p className="text-sm text-slate-300">Noch keine Materialprofile</p>
          <button
            type="button"
            onClick={() => {
              setEditingMaterial(null);
              setShowForm(true);
            }}
            className="mt-3 text-xs text-emerald-300 underline"
          >
            + Erstes Profil erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {materials.map((m) => (
            <MaterialCard
              key={m?.id}
              material={m}
              sensors={sensors}
              onEdit={() => {
                setEditingMaterial(m);
                setShowForm(true);
              }}
              handleDelete={handleDelete}
              onToggle={() => toggleActive(m)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
