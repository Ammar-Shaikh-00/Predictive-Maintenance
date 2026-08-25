import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import SensorCard from "./sensorCard";
import { SensorModal } from "./sensorModel";
import safeApi from "../../../api/safeApi";
import { useErrorToast } from "../../subComponents/errorToast";

/**
 * Module 11 — Sensor Center (production-ready).
 * Primary: GET /sensors + latest readings. Mapping catalog kept as secondary tab.
 * Never invents calibration / signal quality.
 */
export default function Sensors() {
  const { t } = useTranslation();
  const { showError, ErrorComponent } = useErrorToast();

  const [tab, setTab] = useState("center"); // center | mapping
  const [selectedMachine, setSelectedMachine] = useState("");
  const [sensors, setSensors] = useState([]);
  const [latestBySensor, setLatestBySensor] = useState({});
  const [allMachines, setAllMachines] = useState([]);
  const [mappingSensors, setMappingSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState(null);

  const machineNameById = useMemo(() => {
    const map = {};
    for (const m of allMachines || []) {
      map[String(m.id)] = m.name || String(m.id);
    }
    return map;
  }, [allMachines]);

  const loadCenter = useCallback(async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    setError(null);
    try {
      const [sensorRes, machineRes, dataRes] = await Promise.all([
        safeApi.get("/sensors"),
        safeApi.get("/machines"),
        safeApi.get("/sensor-data?limit=800&sort=desc"),
      ]);

      if (sensorRes?.fallback) {
        setError(sensorRes.error || "Sensoren konnten nicht geladen werden");
        setSensors([]);
      } else {
        setSensors(Array.isArray(sensorRes?.data) ? sensorRes.data : []);
      }

      if (!machineRes?.fallback) {
        setAllMachines(Array.isArray(machineRes?.data) ? machineRes.data : []);
      }

      const latest = {};
      if (!dataRes?.fallback && Array.isArray(dataRes?.data)) {
        for (const row of dataRes.data) {
          const sid = String(row.sensor_id || "");
          if (!sid || latest[sid]) continue;
          // first hit is newest because sort=desc
          latest[sid] = {
            value: row.value,
            timestamp: row.timestamp,
            status: row.status || null,
            value_source: "LIVE",
          };
        }
      }
      setLatestBySensor(latest);
    } catch (err) {
      setError(err?.message || "Fehler beim Laden des Sensorzentrums");
      setSensors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMapping = useCallback(async () => {
    try {
      const [sensorRes, machineRes] = await Promise.all([
        safeApi.get("/default-sensors"),
        safeApi.get("/machines"),
      ]);
      setMappingSensors(Array.isArray(sensorRes?.data) ? sensorRes.data : []);
      if (!machineRes?.fallback) {
        setAllMachines(Array.isArray(machineRes?.data) ? machineRes.data : []);
      }
    } catch {
      setError("Sensor-Zuordnungskatalog konnte nicht geladen werden");
    }
  }, []);

  // Load once per tab — do not depend on unstable toast callbacks (causes flicker loops)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      if (tab === "center") await loadCenter({ soft: false });
      else await loadMapping();
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, loadCenter, loadMapping]);

  const createMutation = useMutation({
    mutationFn: (data) => safeApi.post("/default-sensors", data),
    onSuccess: (res) => {
      setMappingSensors((prev) => [...prev, res.data]);
      setShowCreateModal(false);
    },
    onError: () => showError("Sensor-Zuordnung konnte nicht erstellt werden"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => safeApi.put(`/default-sensors/${id}`, data),
    onSuccess: (res, variables) => {
      setMappingSensors((prev) =>
        prev.map((s) => (s.id === variables.id ? res.data : s))
      );
      setIsEditing(false);
      setSelectedSensor(null);
    },
    onError: () => showError("Sensor-Zuordnung konnte nicht aktualisiert werden"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => safeApi.delete(`/default-sensors/${id}`),
    onSuccess: (_, id) => {
      setMappingSensors((prev) => prev.filter((s) => s.id !== id));
    },
    onError: () => showError("Sensor-Zuordnung konnte nicht gelöscht werden"),
  });

  const filteredSensors = useMemo(() => {
    if (!selectedMachine) return sensors;
    return sensors.filter((s) => String(s.machine_id) === String(selectedMachine));
  }, [sensors, selectedMachine]);

  const filteredMapping = useMemo(() => {
    if (!selectedMachine) return mappingSensors;
    return mappingSensors.filter(
      (s) => String(s.machine_id) === String(selectedMachine)
    );
  }, [mappingSensors, selectedMachine]);

  const withReading = filteredSensors.filter(
    (s) => latestBySensor[String(s.id)]
  ).length;

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Module 11
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              Sensorzentrum
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Status, letzter Wert, Schwellenwerte — Historie auf Abruf. Kalibrierung /
              Signalqualität zeigen — bis zur Anbindung.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/machine"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              ← Maschinen
            </Link>
            <Link
              to="/time-range-data-view"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Historie / Export
            </Link>
            <button
              type="button"
              onClick={() =>
                tab === "center" ? loadCenter({ soft: true }) : loadMapping()
              }
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Aktualisieren
            </button>
            {tab === "mapping" ? (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
              >
                + Zuordnung
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("center")}
            className={`rounded-full border px-3 py-1 text-xs ${
              tab === "center"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                : "border-white/10 text-slate-400"
            }`}
          >
            Live-Sensoren
          </button>
          <button
            type="button"
            onClick={() => setTab("mapping")}
            className={`rounded-full border px-3 py-1 text-xs ${
              tab === "mapping"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                : "border-white/10 text-slate-400"
            }`}
          >
            Namens-Zuordnungskatalog
          </button>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            Maschine filtern
          </span>
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="mt-1 block min-w-[200px] rounded-lg border border-white/10 bg-[#0f1218] px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Alle Maschinen</option>
            {allMachines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tab === "center" ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Sensoren", filteredSensors.length],
              ["Mit letztem Messwert", withReading],
              ["Maschinen", allMachines.length],
              ["Warten auf Daten", Math.max(0, filteredSensors.length - withReading)],
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

          {loading && filteredSensors.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {t("loading") || "Laden…"}
            </p>
          ) : filteredSensors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#141820] px-4 py-10 text-center text-sm text-slate-400">
              Noch keine Sensoren registriert für diesen Filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredSensors.map((sensor) => (
                <SensorCard
                  key={sensor.id}
                  mode="center"
                  sensor={sensor}
                  machineName={machineNameById[String(sensor.machine_id)]}
                  latest={latestBySensor[String(sensor.id)]}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">
            SPS- / Standardnamen-Zuordnung (Admin). Nicht die Live-Sensorzentrum-Liste.
          </p>
          {filteredMapping.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#141820] px-4 py-10 text-center text-sm text-slate-400">
              Keine Zuordnungszeilen.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredMapping.map((sensor) => (
                <SensorCard
                  key={sensor.id}
                  mode="mapping"
                  sensor={sensor}
                  machineName={machineNameById[String(sensor.machine_id)]}
                  onEdit={() => {
                    setSelectedSensor(sensor);
                    setIsEditing(true);
                  }}
                  onDelete={() => {
                    if (window.confirm(`Zuordnung ${sensor.name} löschen?`)) {
                      deleteMutation.mutate(sensor.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <SensorModal
        isOpen={showCreateModal || isEditing}
        onClose={() => {
          setShowCreateModal(false);
          setIsEditing(false);
          setSelectedSensor(null);
        }}
        onSave={(data) => {
          if (isEditing && selectedSensor) {
            updateMutation.mutate({ id: selectedSensor.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        sensor={selectedSensor}
        isEditing={isEditing}
        machines={allMachines}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {ErrorComponent}
    </div>
  );
}
