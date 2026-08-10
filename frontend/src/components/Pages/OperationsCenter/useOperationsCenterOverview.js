import { useCallback, useEffect, useRef, useState } from "react";
import safeApi from "../../../api/safeApi";
import {
  lockedFeaturesDemo,
  operationsCenterDemo,
} from "../../../config/operationsCenterDemo";
import {
  computeDigitalizationProgress,
  computePredictionReadiness,
  evaluateFeatures,
} from "../../../utils/capabilityEngine";

const COMPANY_ID = "default";

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
        "Unlocks when required data sources are connected",
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
 * Falls back to demo/local capability engine if aggregate API is unavailable.
 */
export default function useOperationsCenterOverview(pollIntervalMs = 15000) {
  const demo = operationsCenterDemo;
  const [state, setState] = useState({
    loading: true,
    aggregateOk: false,
    liveFeedOk: false,
    hardeningOk: false,
    error: null,
    plantStatus: demo.plantStatus,
    machineState: null,
    machineValues: demo.machineValues,
    warnings: demo.warnings,
    risks: demo.risks,
    connectedMachine: demo.machines.find((m) => m.connected),
    greyMachines: demo.machines.filter((m) => !m.connected),
    connectedMachines: demo.connectedMachines,
    totalMachines: demo.totalMachines,
    digitalizationProgress: computeDigitalizationProgress(demo.connectedSources),
    predictionReadiness: computePredictionReadiness(
      demo.connectedSources,
      demo.basePredictionReadiness,
      demo.readinessBoost
    ),
    dataQualityScore: demo.dataQuality,
    connectedSources: demo.connectedSources,
    missingSources: demo.missingSources,
    features: evaluateFeatures(lockedFeaturesDemo, demo.connectedSources),
    recentEvents: [],
    networkNotes: demo.networkNotes,
    activating: null,
    lastUpdated: null,
    cacheHit: false,
  });

  const inFlight = useRef(false);

  const applyPayload = useCallback(
    (data, aggregateOk = true) => {
      const connected = data?.connected_sources?.length
        ? data.connected_sources
        : demo.connectedSources;
      const missing = data?.missing_sources?.length
        ? data.missing_sources
        : demo.missingSources.filter((s) => !connected.includes(s));

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
        plantStatus: data?.plant_status || demo.plantStatus,
        machineState: data?.machine_state || null,
        machineValues: data?.machine_values?.length
          ? data.machine_values
          : demo.machineValues,
        warnings: data?.warnings?.length ? data.warnings : demo.warnings,
        risks: data?.risks?.length ? data.risks : demo.risks,
        connectedMachine: data?.connected_machine || prev.connectedMachine,
        greyMachines: data?.grey_machines?.length
          ? data.grey_machines
          : demo.machines.filter((m) => !m.connected),
        connectedMachines:
          data?.connected_machines ?? demo.connectedMachines,
        totalMachines: Math.max(
          data?.total_machines ?? 0,
          demo.totalMachines
        ),
        digitalizationProgress:
          data?.digitalization_progress ??
          computeDigitalizationProgress(connected),
        predictionReadiness:
          data?.prediction_readiness ??
          computePredictionReadiness(
            connected,
            demo.basePredictionReadiness,
            demo.readinessBoost
          ),
        dataQualityScore: data?.data_quality_score ?? demo.dataQuality,
        connectedSources: connected,
        missingSources: missing,
        features: mapFeatures(data?.feature_status, connected),
        recentEvents: data?.recent_progress_events || [],
        networkNotes: data?.network_notes || demo.networkNotes,
        lastUpdated: new Date(),
        cacheHit: Boolean(data?.cache_hit),
      }));
    },
    [demo]
  );

  const fetchOverview = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await safeApi.get(
        `/operations-center/overview?company_id=${COMPANY_ID}&bootstrap_if_empty=true`
      );
      if (res?.fallback || !res?.data) {
        setState((prev) => ({
          ...prev,
          loading: false,
          aggregateOk: false,
          liveFeedOk: false,
          hardeningOk: false,
          error:
            res?.error ||
            "Übersicht nicht verfügbar — lokaler Demo-Fallback aktiv",
          lastUpdated: new Date(),
        }));
        return;
      }
      applyPayload(res.data, true);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        aggregateOk: false,
        error: err?.message || "Betriebszentrale-Übersicht konnte nicht geladen werden",
        lastUpdated: new Date(),
      }));
    } finally {
      inFlight.current = false;
    }
  }, [applyPayload]);

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
              predictionReadiness: computePredictionReadiness(
                connected,
                demo.basePredictionReadiness,
                demo.readinessBoost
              ),
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
