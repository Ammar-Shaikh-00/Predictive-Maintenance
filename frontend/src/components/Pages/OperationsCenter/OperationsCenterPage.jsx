import { useCallback, useEffect, useMemo, useState } from "react";
import { operationsCenterDemo } from "../../../config/operationsCenterDemo";
import safeApi from "../../../api/safeApi";
import OcHeroKpis from "./components/OcHeroKpis";
import ProductionMap from "./components/ProductionMap";
import CockpitSideColumn from "./components/CockpitSideColumn";
import AiRecommendationCard from "./components/AiRecommendationCard";
import CurrentRunBar from "./components/CurrentRunBar";
import EventHistoryBar from "./components/EventHistoryBar";
import MissingSources from "./components/MissingSources";
import SetupWizard from "./components/SetupWizard";
import useOperationsCenterOverview from "./useOperationsCenterOverview";
import {
  buildTimelineEvents,
  countAlarmSeverities,
  mapOrderBoardToRunBar,
  pickRecommendation,
} from "./buildOcCockpit";
import { buildDigitalizationChecklist, COSMETIC_SOURCE_KEYS } from "../../../utils/capabilityEngine";
import "./operationsCenter.css";

/**
 * ZITTA Operations Center homepage — production-ready cockpit layout
 * matching assets/zitta-homepage-production-ready.png
 *
 * KPI strip → [Map | Side column] → KI → Footer
 */
export default function OperationsCenterPage() {
  const demo = operationsCenterDemo;
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const oc = useOperationsCenterOverview(
    demo.pollIntervalMs || 15000,
    selectedMachineId
  );
  const [wizardSource, setWizardSource] = useState(null);
  const [runBar, setRunBar] = useState(null);
  const [dbMachineCount, setDbMachineCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await safeApi.get("/machines");
      if (cancelled) return;
      const rows = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.items)
          ? res.data.items
          : [];
      if (!res?.fallback && rows.length >= 0) {
        setDbMachineCount(rows.length);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedMachineId) return;
    const fromLine = (oc.lineMachines || []).find(
      (m) => m.connected || m.has_live_feed
    );
    const fallback =
      (oc.connectedMachine?.connected || oc.connectedMachine?.has_live_feed
        ? oc.connectedMachine?.id
        : null) ||
      fromLine?.id ||
      null;
    if (fallback) setSelectedMachineId(String(fallback));
  }, [selectedMachineId, oc.lineMachines, oc.connectedMachine]);

  const activeMachineId =
    selectedMachineId || oc.selectedMachineId || oc.connectedMachine?.id || null;

  const orderBoardMachineId = useMemo(() => {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (activeMachineId && uuidRe.test(String(activeMachineId))) {
      return String(activeMachineId);
    }
    const fromSnap =
      oc.aiSnapshot?.machine_id ||
      oc.aiSnapshot?.latest_run?.machine_id ||
      oc.aiSnapshot?.recommendation?.machine_id;
    if (fromSnap && uuidRe.test(String(fromSnap))) {
      return String(fromSnap);
    }
    return null;
  }, [activeMachineId, oc.aiSnapshot]);

  const remainingCount = Math.max(0, oc.totalMachines - oc.connectedMachines);
  const machineTotal =
    dbMachineCount != null ? dbMachineCount : oc.totalMachines;

  const alarmCounts = useMemo(
    () => countAlarmSeverities(oc.warnings),
    [oc.warnings]
  );

  const timeline = useMemo(
    () =>
      buildTimelineEvents({
        plantStatus: oc.plantStatus,
        warnings: oc.warnings,
        risks: oc.risks,
        recentEvents: oc.recentEvents,
        now: oc.lastUpdated || new Date(),
      }),
    [oc.plantStatus, oc.warnings, oc.risks, oc.recentEvents, oc.lastUpdated]
  );

  const recommendation = useMemo(() => {
    const fromSnap =
      oc.aiSnapshot?.recommendation || oc.aiSnapshot?.latest_run || null;
    if (fromSnap?.text || fromSnap?.explanation_text) {
      return {
        text: fromSnap.text || fromSnap.explanation_text,
        explanation_text: fromSnap.explanation_text || null,
        action: fromSnap.action || null,
        value_source: fromSnap.value_source || "RULE_BASED",
        display_label: fromSnap.display_label || null,
        overall_status: fromSnap.overall_status || null,
        detected_state: fromSnap.detected_state || null,
        stability_status: fromSnap.stability_status || null,
        drift_score: fromSnap.drift_score ?? null,
        active_regime: fromSnap.active_regime || null,
        ml_is_anomaly: fromSnap.ml_is_anomaly,
        ml_anomaly_score: fromSnap.ml_anomaly_score ?? null,
        provenance_tags: fromSnap.provenance_tags || [],
        feature_drivers: fromSnap.feature_drivers || [],
      };
    }
    return pickRecommendation(oc.risks, oc.warnings);
  }, [oc.aiSnapshot, oc.risks, oc.warnings]);

  const loadRunBar = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (orderBoardMachineId) qs.set("machine_id", orderBoardMachineId);
      const path = qs.toString()
        ? `/production-run/order-board?${qs.toString()}`
        : "/production-run/order-board";
      const res = await safeApi.get(path);
      if (!res?.fallback && res?.data) {
        setRunBar(mapOrderBoardToRunBar(res.data));
      } else if (res?.data?.empty) {
        setRunBar(null);
      }
    } catch {
      /* keep previous */
    }
  }, [orderBoardMachineId]);

  useEffect(() => {
    setRunBar(null);
    loadRunBar();
    const id = setInterval(loadRunBar, demo.pollIntervalMs || 15000);
    return () => clearInterval(id);
  }, [loadRunBar, demo.pollIntervalMs]);

  const handleOpenWizard = useCallback((sourceKey) => {
    setWizardSource(sourceKey);
  }, []);

  const handleWizardCompleted = useCallback(
    async ({ sourceKey, ok, local }) => {
      if (local && !ok) {
        await oc.activateSource(sourceKey);
      } else {
        await oc.refresh();
      }
    },
    [oc]
  );

  const handleSelectMachine = useCallback((machineId) => {
    if (!machineId) return;
    setSelectedMachineId(String(machineId));
  }, []);

  const lastTick = oc.lastUpdated || new Date();
  const online = ["PRODUCTION", "READY", "HEATING", "COOLING", "LOW_PRODUCTION"].includes(
    String(oc.plantStatus || "").toUpperCase()
  );

  const { done: checklistDone, open: checklistOpen } = useMemo(
    () =>
      buildDigitalizationChecklist(oc.connectedSources, oc.missingSources),
    [oc.connectedSources, oc.missingSources]
  );

  return (
    <div className="oc-skin oc-cockpit w-full max-w-full overflow-x-hidden pb-8 text-slate-100">
      <div className="w-full space-y-3 sm:space-y-3.5">
        {oc.error ? (
          <p className="text-xs text-amber-200/90">{oc.error}</p>
        ) : null}

        <OcHeroKpis
          plantStatus={oc.plantStatus}
          online={online}
          readiness={
            oc.predictionReadiness != null &&
            Number.isFinite(Number(oc.predictionReadiness))
              ? Math.round(Number(oc.predictionReadiness))
              : null
          }
          readinessHint={
            oc.predictionReadinessHint ||
            (oc.predictionReadiness != null
              ? "AI/ML-Dienst"
              : "AI/ML · noch nicht gemeldet")
          }
          oee={oc.oee}
          oeeHint={oc.oeeHint || "Quelle fehlt"}
          nextMaintenanceDays={oc.nextMaintenanceDays}
          maintenanceHint={oc.maintenanceHint}
          alarmsCritical={alarmCounts.critical}
          alarmsWarning={alarmCounts.warning}
        />

        {/* Map | Digitalization + locked + provenance */}
        <div className="oc-mid-split">
          <ProductionMap
            connectedMachine={oc.connectedMachine}
            greyMachines={oc.greyMachines}
            lineMachines={oc.lineMachines}
            remainingCount={remainingCount}
            connectedMachines={oc.connectedMachines}
            totalMachines={machineTotal}
            selectedMachineId={activeMachineId}
            onSelectMachine={handleSelectMachine}
            machineValues={oc.machineValues}
          />
          <CockpitSideColumn
            progress={oc.digitalizationProgress ?? 0}
            checklistDone={checklistDone}
            checklistOpen={checklistOpen}
            features={oc.features}
            connectedMachines={oc.connectedMachines}
            totalMachines={machineTotal}
            capability={oc.capability}
          />
        </div>

        {/* KI-Analyse */}
        <AiRecommendationCard recommendation={recommendation} />

        <MissingSources
          missingSources={(oc.missingSources || []).filter(
            (key) => !COSMETIC_SOURCE_KEYS.has(key)
          )}
          onConnect={handleOpenWizard}
          activating={wizardSource}
          backendDriven={oc.aggregateOk}
        />
        <EventHistoryBar events={timeline} />
        <CurrentRunBar run={runBar} dataCurrent={lastTick} />
      </div>

      <SetupWizard
        open={Boolean(wizardSource)}
        sourceKey={wizardSource}
        backendAvailable={oc.aggregateOk}
        onClose={() => setWizardSource(null)}
        onCompleted={handleWizardCompleted}
      />
    </div>
  );
}
