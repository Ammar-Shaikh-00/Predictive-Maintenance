import { useCallback, useEffect, useRef, useState } from "react";
import safeApi from "../../../api/safeApi";
import {
  lockedFeaturesDemo,
  operationsCenterDemo,
} from "../../../config/operationsCenterDemo";
import {
  computeDigitalizationProgress,
  evaluateFeatures,
} from "../../../utils/capabilityEngine";

const COMPANY_ID = "default";

function mapBackendFeatureStatus(status = "") {
  const s = String(status).toUpperCase();
  if (s === "ACTIVE") return "active";
  if (s === "COLLECTING_DATA" || s === "TRAINING" || s === "VALIDATION_REQUIRED") {
    return "partially_available";
  }
  if (s === "SETUP_REQUIRED" || s === "DEGRADED") return "partially_available";
  return "locked";
}

function mapFeaturesFromOverview(overview, fallbackConnected) {
  const rows = overview?.feature_status;
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((row) => ({
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

  return evaluateFeatures(
    lockedFeaturesDemo,
    fallbackConnected || operationsCenterDemo.connectedSources
  );
}

/**
 * Loads /operations-hardening/overview (auto-bootstraps empty registries)
 * and activates sources via setup-wizard API.
 * Prediction readiness is NEVER invented from connected sources — AI/ML only.
 */
export default function useOperationsHardening(pollIntervalMs = 15000) {
  const demo = operationsCenterDemo;
  const [state, setState] = useState({
    loading: true,
    backendOk: false,
    error: null,
    digitalizationProgress: computeDigitalizationProgress(demo.connectedSources),
    predictionReadiness: null,
    dataQualityScore: demo.dataQuality,
    connectedSources: demo.connectedSources,
    missingSources: demo.missingSources,
    connectedMachines: demo.connectedMachines,
    totalMachines: demo.totalMachines,
    features: evaluateFeatures(lockedFeaturesDemo, demo.connectedSources),
    recentEvents: [],
    activating: null,
    lastUpdated: null,
  });

  const inFlight = useRef(false);

  const applyOverview = useCallback((overview, backendOk = true) => {
    const connected = overview?.connected_sources?.length
      ? overview.connected_sources
      : demo.connectedSources;
    const missing = overview?.missing_sources?.length
      ? overview.missing_sources
      : demo.missingSources.filter((s) => !connected.includes(s));

    // Hardening may mirror 0.0 when ML table empty — treat as unavailable
    const rawReady = overview?.prediction_readiness;
    const predictionReadiness =
      rawReady != null &&
      Number.isFinite(Number(rawReady)) &&
      Number(rawReady) > 0
        ? Number(rawReady)
        : null;

    setState((prev) => ({
      ...prev,
      loading: false,
      backendOk,
      error: backendOk ? null : prev.error,
      digitalizationProgress:
        overview?.digitalization_progress ??
        computeDigitalizationProgress(connected),
      predictionReadiness,
      dataQualityScore: overview?.data_quality_score ?? demo.dataQuality,
      connectedSources: connected,
      missingSources: missing,
      connectedMachines:
        overview?.connected_machines ?? demo.connectedMachines,
      totalMachines: Math.max(
        overview?.total_machines ?? 0,
        demo.totalMachines
      ),
      features: mapFeaturesFromOverview(overview, connected),
      recentEvents: overview?.recent_progress_events || [],
      lastUpdated: new Date(),
    }));
  }, [demo]);

  const fetchOverview = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await safeApi.get(
        `/operations-hardening/overview?company_id=${COMPANY_ID}&bootstrap_if_empty=true`
      );
      if (res?.fallback || !res?.data) {
        setState((prev) => ({
          ...prev,
          loading: false,
          backendOk: false,
          predictionReadiness: null,
          error: res?.error || "Hardening-API nicht verfügbar — lokaler Demo-Modus aktiv",
          lastUpdated: new Date(),
        }));
        return;
      }
      applyOverview(res.data, true);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        backendOk: false,
        predictionReadiness: null,
        error: err?.message || "Hardening-Übersicht konnte nicht geladen werden",
        lastUpdated: new Date(),
      }));
    } finally {
      inFlight.current = false;
    }
  }, [applyOverview]);

  const activateSource = useCallback(
    async (sourceKey) => {
      setState((prev) => ({ ...prev, activating: sourceKey }));
      try {
        await safeApi.post("/operations-hardening/setup-wizard/start", {
          company_id: COMPANY_ID,
          source_key: sourceKey,
          source_type: sourceKey,
          field_mapping: { timestamp: "timestamp", value: "value" },
          import_history_days: 30,
          preview_rows: 50,
        });

        const activateRes = await safeApi.post(
          `/operations-hardening/setup-wizard/activate/${encodeURIComponent(
            sourceKey
          )}?company_id=${COMPANY_ID}`
        );

        if (activateRes?.fallback) {
          setState((prev) => {
            const connected = [
              ...new Set([...prev.connectedSources, sourceKey]),
            ];
            const missing = prev.missingSources.filter((s) => s !== sourceKey);
            return {
              ...prev,
              activating: null,
              backendOk: false,
              connectedSources: connected,
              missingSources: missing,
              digitalizationProgress: computeDigitalizationProgress(connected),
              features: evaluateFeatures(lockedFeaturesDemo, connected),
              error:
                activateRes?.error ||
                "Aktivierung lokal gespeichert — Backend-Aktivierung fehlgeschlagen",
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
          error: err?.message || "Datenquelle konnte nicht aktiviert werden",
        }));
        return { ok: false };
      }
    },
    [fetchOverview]
  );

  useEffect(() => {
    fetchOverview();
    const id = setInterval(fetchOverview, pollIntervalMs || 15000);
    return () => clearInterval(id);
  }, [fetchOverview, pollIntervalMs]);

  return {
    ...state,
    refresh: fetchOverview,
    activateSource,
  };
}
