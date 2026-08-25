import { useCallback, useEffect, useRef, useState } from "react";
import safeApi from "../../../api/safeApi";
import { operationsCenterDemo } from "../../../config/operationsCenterDemo";
import {
  buildConnectedMachineView,
  buildLiveMachineValues,
  buildLiveWarnings,
  mapPlantStatus,
} from "./mapLiveData";

const DEFAULT_POLL_MS = 15000;

/**
 * Stage 2 live feed for Operations Center.
 * One combined poll cycle (no per-sensor storms). No SIMULATED demo values.
 */
export default function useOperationsCenterLive(pollIntervalMs = DEFAULT_POLL_MS) {
  const demo = operationsCenterDemo;
  const [live, setLive] = useState({
    loading: true,
    error: null,
    plantStatus: "STOPPED",
    machineState: null,
    machineValues: demo.machineValues,
    warnings: [],
    risks: [],
    connectedMachine: demo.machines.find((m) => m.connected),
    greyMachines: demo.machines.filter((m) => !m.connected),
    connectedMachines: 0,
    totalMachines: demo.totalMachines,
    liveFeedOk: false,
    lastUpdated: null,
    dataQualityHint: null,
  });

  const inFlight = useRef(false);

  const fetchLive = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;

    try {
      const [
        currentRes,
        derivedRes,
        statusRes,
        windowsRes,
        alarmsRes,
        machinesRes,
      ] = await Promise.all([
        safeApi.get("/dashboard/current"),
        safeApi.get("/dashboard/extruder/derived?window_minutes=30"),
        safeApi.get("/dashboard/extruder/status"),
        safeApi.get("/live-process-windows?limit=1"),
        safeApi.get("/alarms?status=active"),
        safeApi.get("/machines"),
      ]);

      const currentDashboard = currentRes?.data || null;
      const derived = derivedRes?.data || null;
      const extruderStatus = statusRes?.data || null;
      const windowRow = windowsRes?.data?.[0] || null;
      const alarms = Array.isArray(alarmsRes?.data) ? alarmsRes.data : [];
      const machinesList = Array.isArray(machinesRes?.data)
        ? machinesRes.data
        : Array.isArray(machinesRes?.data?.items)
          ? machinesRes.data.items
          : [];

      const machineState =
        currentDashboard?.machine_state ||
        windowRow?.confirmed_state ||
        windowRow?.state ||
        null;

      const plantStatus = mapPlantStatus(machineState);

      const machineValues = buildLiveMachineValues({
        currentDashboard,
        derived,
        machineState,
      });

      const warnings = buildLiveWarnings({
        alarms,
        currentDashboard,
        extruderStatus,
      });

      const connectedFromApi = machinesList.filter(
        (m) =>
          m.status === "online" ||
          m.is_connected === true ||
          String(m.type || m.machine_type || "")
            .toLowerCase()
            .includes("extruder")
      ).length;

      const connectedMachines = Math.max(
        connectedFromApi || 0,
        machineState ? 1 : 0
      );

      const totalMachines = Math.max(
        demo.totalMachines,
        machinesList.length || 0,
        connectedMachines
      );

      const anyLiveMetric = machineValues.some(
        (v) => v.value !== "—" && v.value_source !== "SIMULATED" && v.key !== "energy"
      );
      const liveFeedOk =
        Boolean(currentRes && !currentRes.fallback && currentDashboard) ||
        Boolean(derivedRes && !derivedRes.fallback && derived) ||
        anyLiveMetric;

      setLive({
        loading: false,
        error: liveFeedOk
          ? null
          : currentRes?.error || derivedRes?.error || "Live-Feed nicht verfügbar",
        plantStatus,
        machineState,
        machineValues,
        warnings,
        risks: [],
        connectedMachine: buildConnectedMachineView({
          machineState: machineState || "NOT_CONNECTED",
          currentDashboard,
          sensorCount: 21,
        }),
        greyMachines: demo.machines.filter((m) => !m.connected),
        connectedMachines,
        totalMachines,
        liveFeedOk,
        lastUpdated: new Date(),
        dataQualityHint: liveFeedOk ? demo.dataQuality : null,
      });
    } catch (err) {
      setLive((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || "Live-Daten der Betriebszentrale konnten nicht geladen werden",
        liveFeedOk: false,
        machineValues: demo.machineValues,
        warnings: [],
        risks: [],
        plantStatus: "STOPPED",
        lastUpdated: new Date(),
      }));
    } finally {
      inFlight.current = false;
    }
  }, [demo]);

  useEffect(() => {
    fetchLive();
    const ms = pollIntervalMs || DEFAULT_POLL_MS;
    const id = setInterval(fetchLive, ms);
    return () => clearInterval(id);
  }, [fetchLive, pollIntervalMs]);

  return { ...live, refresh: fetchLive };
}
