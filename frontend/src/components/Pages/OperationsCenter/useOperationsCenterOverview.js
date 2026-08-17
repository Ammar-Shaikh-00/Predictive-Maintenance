import { useCallback, useEffect, useRef, useState } from "react";
import safeApi from "../../../api/safeApi";
import {
  lockedFeaturesDemo,
  operationsCenterDemo,
  EMPTY_MACHINE_VALUES,
} from "../../../config/operationsCenterDemo";
import {
  computeDigitalizationProgress,
  evaluateFeatures,
} from "../../../utils/capabilityEngine";
import { localizeUiText, resolveMlPredictionReadiness } from "./buildOcCockpit";
import { fetchLiveAiSnapshot } from "./buildLiveAiSnapshot";

const COMPANY_ID = "default";

function isSimulated(item) {
  return String(item?.value_source || "").toUpperCase() === "SIMULATED";
}

function localizeMachineValues(values = []) {
  return values.map((v) => ({
    ...v,
    label: localizeUiText(v.label) || v.label,
    lockedHint: v.lockedHint ? localizeUiText(v.lockedHint) : v.lockedHint,
  }));
}

function sanitizeMachineValues(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return localizeMachineValues(EMPTY_MACHINE_VALUES);
  }
  const liveOnly = values.filter((v) => !isSimulated(v));
  if (!liveOnly.length) {
    return localizeMachineValues(EMPTY_MACHINE_VALUES);
  }
  return localizeMachineValues(liveOnly);
}

function sanitizeWarnings(warnings) {
  if (!Array.isArray(warnings)) return [];
  return warnings.filter((w) => !isSimulated(w));
}

function sanitizeRisks(risks) {
  if (!Array.isArray(risks)) return [];
  return risks.filter((r) => !isSimulated(r));
}

function localizeNetworkNotes(notes = []) {
  return notes.map((n) => localizeUiText(n));
}

function mapBackendFeatureStatus(status = "") {
  const s = String(status).toUpperCase();
  if (s === "ACTIVE") return "active";
  if (
    ["COLLECTING_DATA", "TRAINING", "VALIDATION_REQUIRED", "SETUP_REQUIRED", "DEGRADED"].includes(
      s
    )
  ) {
    return "partially_available";
  }
  return "locked";
}

function mapFeatures(featureStatus, connectedSources) {
  if (Array.isArray(featureStatus) && featureStatus.length > 0) {
    return featureStatus.map((row) => ({
      key: row.feature_key,
      name:
        row.notes?.name ||
        lockedFeaturesDemo.find((f) => f.key === row.feature_key)?.name ||
        row.feature_key,
      benefit:
        lockedFeaturesDemo.find((f) => f.key === row.feature_key)?.benefit ||
        row.notes?.description ||
        "Wird freigeschaltet, wenn die erforderlichen Datenquellen verbunden sind",
      requires: row.notes?.required_sources || row.missing_sources || [],
      missingSources: row.missing_sources || [],
      status: mapBackendFeatureStatus(row.status),
      backendStatus: row.status,
      isAvailable: String(row.status).toUpperCase() === "ACTIVE",
    }));
  }
  return evaluateFeatures(lockedFeaturesDemo, connectedSources);
}

/**
 * Single-poll Operations Center consumer for GET /operations-center/overview.
 * Never falls back to invented SIMULATED process values.
 * Optional machineId scopes live values / alarms / maintenance to the map selection.
 */
export default function useOperationsCenterOverview(
  pollIntervalMs = 15000,
  machineId = null
) {
  const demo = operationsCenterDemo;
  const [state, setState] = useState({
    loading: true,
    aggregateOk: false,
    liveFeedOk: false,
    hardeningOk: false,
    error: null,
    plantStatus: "STOPPED",
    machineState: null,
    machineValues: localizeMachineValues(EMPTY_MACHINE_VALUES),
    warnings: [],
    risks: [],
    aiSnapshot: null,
    connectedMachine: demo.machines.find((m) => m.connected),
    greyMachines: demo.machines.filter((m) => !m.connected),
    lineMachines: [],
    selectedMachineId: machineId,
    selectedMachineName: null,
    connectedMachines: 0,
    totalMachines: demo.totalMachines,
    digitalizationProgress: 0,
    predictionReadiness: null,
    predictionReadinessHint: null,
    predictionReadinessMeta: null,
    dataQualityScore: null,
    oee: null,
    oeeHint: null,
    nextMaintenanceDays: null,
    maintenanceHint: null,
    connectedSources: [],
    missingSources: demo.missingSources,
    features: evaluateFeatures(lockedFeaturesDemo, []),
    recentEvents: [],
    networkNotes: [],
    activating: null,
    lastUpdated: null,
    cacheHit: false,
  });

  const requestSeq = useRef(0);

  const applyPayload = useCallback(
    (data, aggregateOk = true) => {
      const connected = Array.isArray(data?.connected_sources)
        ? data.connected_sources
        : [];
      const missing = Array.isArray(data?.missing_sources)
        ? data.missing_sources
        : demo.missingSources.filter((s) => !connected.includes(s));
      const mlReadiness = resolveMlPredictionReadiness(data);

      setState((prev) => ({
        ...prev,
        loading: false,
        aggregateOk,
        liveFeedOk: Boolean(data?.live_feed_ok),
        hardeningOk: aggregateOk,
        error: aggregateOk
          ? data?.feed_error && !data?.live_feed_ok
            ? data.feed_error
            : null
          : prev.error,
        plantStatus: data?.plant_status || "STOPPED",
        machineState: data?.machine_state || null,
        machineValues: sanitizeMachineValues(data?.machine_values),
        warnings: sanitizeWarnings(data?.warnings),
        risks: sanitizeRisks(data?.risks),
        aiSnapshot: data?.ai_snapshot || null,
        connectedMachine: data?.connected_machine || prev.connectedMachine,
        greyMachines: data?.grey_machines?.length
          ? data.grey_machines
          : demo.machines.filter((m) => !m.connected),
        lineMachines: Array.isArray(data?.line_machines) ? data.line_machines : [],
        selectedMachineId:
          data?.selected_machine_id || data?.connected_machine?.id || machineId,
        selectedMachineName:
          data?.selected_machine_name || data?.connected_machine?.name || null,
        connectedMachines: data?.connected_machines ?? 0,
        totalMachines: Math.max(
          data?.total_machines ?? 0,
          demo.totalMachines
        ),
        digitalizationProgress:
          data?.digitalization_progress ??
          computeDigitalizationProgress(connected),
        predictionReadiness: mlReadiness.value,
        predictionReadinessHint: mlReadiness.hint,
        predictionReadinessMeta: mlReadiness.meta,
        dataQualityScore: data?.data_quality_score ?? null,
        oee:
          data?.oee?.available && data?.oee?.value != null
            ? Number(data.oee.value)
            : null,
        oeeHint: data?.oee?.hint || null,
        nextMaintenanceDays:
          data?.next_maintenance?.available &&
          data?.next_maintenance?.days != null
            ? Number(data.next_maintenance.days)
            : null,
        maintenanceHint: data?.next_maintenance?.hint || null,
        connectedSources: connected,
        missingSources: missing,
        features: mapFeatures(data?.feature_status, connected),
        recentEvents: data?.recent_progress_events || [],
        networkNotes: localizeNetworkNotes(data?.network_notes || []),
        lastUpdated: new Date(),
        cacheHit: Boolean(data?.cache_hit),
      }));
    },
    [demo, machineId]
  );

  const fetchOverview = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const qs = new URLSearchParams({
        company_id: COMPANY_ID,
        bootstrap_if_empty: "true",
      });
      if (machineId) qs.set("machine_id", machineId);
      const res = await safeApi.get(`/operations-center/overview?${qs.toString()}`);
      // Ignore stale responses when the user switched machines mid-flight
      if (seq !== requestSeq.current) return;
      if (res?.fallback || !res?.data) {
        setState((prev) => ({
          ...prev,
          loading: false,
          aggregateOk: false,
          liveFeedOk: false,
          hardeningOk: false,
          machineValues: localizeMachineValues(EMPTY_MACHINE_VALUES),
          warnings: [],
          risks: [],
          plantStatus: "STOPPED",
          error:
            res?.error ||
            "Übersicht nicht verfügbar — keine simulierten Ersatzwerte",
          lastUpdated: new Date(),
        }));
        return;
      }
      applyPayload(res.data, true);

      // Older remotes omit ai_snapshot — compose Module 7 from live_* APIs.
      const snap = res.data?.ai_snapshot;
      const hasRec =
        snap?.recommendation?.text ||
        snap?.recommendation?.explanation_text ||
        snap?.latest_run?.text ||
        snap?.latest_run?.explanation_text;
      if (!hasRec) {
        try {
          const composed = await fetchLiveAiSnapshot(safeApi, {
            historyLimit: 10,
            machineId,
          });
          if (seq !== requestSeq.current) return;
          if (composed?.available || composed?.recommendation) {
            setState((prev) => ({
              ...prev,
              aiSnapshot: composed,
              risks:
                prev.risks?.length > 0
                  ? prev.risks
                  : sanitizeRisks(composed.risks || []),
            }));
          }
        } catch {
          /* keep overview without AI panel */
        }
      }
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        aggregateOk: false,
        machineValues: localizeMachineValues(EMPTY_MACHINE_VALUES),
        warnings: [],
        risks: [],
        plantStatus: "STOPPED",
        error: err?.message || "Betriebszentrale-Übersicht konnte nicht geladen werden",
        lastUpdated: new Date(),
      }));
    }
  }, [applyPayload, machineId]);

  const activateSource = useCallback(
    async (sourceKey) => {
      // Real activation requires wizard import; keep local-only fallback for offline demos.
      setState((prev) => ({ ...prev, activating: sourceKey }));
      try {
        const activateRes = await safeApi.post(
          `/operations-hardening/setup-wizard/activate/${encodeURIComponent(
            sourceKey
          )}?company_id=${COMPANY_ID}`
        );
        if (activateRes?.fallback) {
          setState((prev) => {
            const connected = [...new Set([...prev.connectedSources, sourceKey])];
            const missing = prev.missingSources.filter((s) => s !== sourceKey);
            return {
              ...prev,
              activating: null,
              connectedSources: connected,
              missingSources: missing,
              digitalizationProgress: computeDigitalizationProgress(connected),
              features: evaluateFeatures(lockedFeaturesDemo, connected),
              error:
                activateRes?.error ||
                "Lokal aktiviert — Setup-Assistent-Import für Produktivaktivierung abschließen",
            };
          });
          return { ok: false };
        }
        await fetchOverview();
        setState((prev) => ({ ...prev, activating: null }));
        return { ok: true };
      } catch (err) {
        setState((prev) => ({
          ...prev,
          activating: null,
          error:
            err?.message ||
            "Aktivierung fehlgeschlagen — Setup-Assistent zuerst mit echtem Konnektor abschließen",
        }));
        return { ok: false };
      }
    },
    [demo, fetchOverview]
  );

  // On machine switch: clear scoped values immediately so OC visibly updates
  useEffect(() => {
    if (machineId == null) return;
    setState((prev) => ({
      ...prev,
      loading: true,
      machineValues: localizeMachineValues(EMPTY_MACHINE_VALUES),
      warnings: [],
      plantStatus: "STOPPED",
      machineState: null,
      oee: null,
      nextMaintenanceDays: null,
      selectedMachineId: machineId,
    }));
  }, [machineId]);

  useEffect(() => {
    fetchOverview();
    const ms = pollIntervalMs || 15000;
    const id = setInterval(fetchOverview, ms);
    return () => clearInterval(id);
  }, [fetchOverview, pollIntervalMs]);

  return {
    ...state,
    backendOk: state.aggregateOk,
    refresh: fetchOverview,
    activateSource,
  };
}
