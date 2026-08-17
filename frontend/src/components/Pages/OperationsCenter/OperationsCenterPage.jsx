import { useCallback, useEffect, useMemo, useState } from "react";
import { operationsCenterDemo } from "../../../config/operationsCenterDemo";
import safeApi from "../../../api/safeApi";
import OcHeroKpis from "./components/OcHeroKpis";
import ProductionMap from "./components/ProductionMap";
import AccuracyGaugePanel from "./components/AccuracyGaugePanel";
import LiveTrendsPanel from "./components/LiveTrendsPanel";
import ProductionTimeline from "./components/ProductionTimeline";
import AiRecommendationCard from "./components/AiRecommendationCard";
import CurrentRunBar from "./components/CurrentRunBar";
import MissingSources from "./components/MissingSources";
import SetupWizard from "./components/SetupWizard";
import useOperationsCenterOverview from "./useOperationsCenterOverview";
import {
  buildReadinessFactors,
  buildTimelineEvents,
  countAlarmSeverities,
  mapOrderBoardToRunBar,
  pickRecommendation,
} from "./buildOcCockpit";
import "./operationsCenter.css";

/**
 * ZITTA Operations Center — PDF cockpit layout.
 * Composition: KPI strip → Anlagenübersicht →
 *   [Accuracy + Timeline + KI | Live Trends] → Run bar
 * Machine cards in Anlagenübersicht select the active machine context (no dropdown).
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

  // Default selection: first open machine (connected or live feed)
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

  /** ProductionRun.machine_id is UUID — map slugs like extruder_01 via live snapshot. */
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

  const readinessFactors = useMemo(
    () => buildReadinessFactors(oc.connectedSources, oc.dataQualityScore),
    [oc.connectedSources, oc.dataQualityScore]
  );

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
  const online = ["PRODUCTION", "READY", "HEATING", "COOLING"].includes(
    String(oc.plantStatus || "").toUpperCase()
  );

  const selectedLabel =
    oc.connectedMachine?.name ||
    oc.selectedMachineName ||
    (oc.lineMachines || []).find((m) => String(m.id) === String(activeMachineId))
      ?.name ||
    null;

  const trendValues = useMemo(() => {
    const base = Array.isArray(oc.machineValues) ? [...oc.machineValues] : [];
    const keys = new Set(base.map((v) => v.key));
    if (!keys.has("throughput")) {
      base.push({
        key: "throughput",
        label: "Materialdurchsatz",
        value: "—",
        unit: "",
        traffic: "grey",
        value_source: "LIVE",
        lockedHint: "Durchsatzquelle noch nicht verbunden",
        spark: [],
      });
    }
    if (!keys.has("scrap")) {
      base.push({
        key: "scrap",
        label: "Ausschussquote",
        value: "—",
        unit: "",
        traffic: "grey",
        value_source: "LIVE",
        lockedHint: "Qualitätsdaten anbinden",
        spark: [],
      });
    }
    return base;
  }, [oc.machineValues]);

  return (
    <div className="oc-skin oc-cockpit w-full max-w-full min-h-[calc(100vh-5rem)] overflow-x-hidden pb-28 text-slate-100">
      <div className="w-full space-y-3 sm:space-y-4">
        {oc.error ? (
          <p className="text-xs text-amber-200/90">{oc.error}</p>
        ) : null}
        {selectedLabel ? (
          <p className="text-[11px] text-slate-400">
            Ausgewählte Maschine:{" "}
            <span className="font-medium text-emerald-300">{selectedLabel}</span>
            <span className="text-slate-500">
              {" "}
              — Werte unten beziehen sich auf diese Maschine
            </span>
          </p>
        ) : null}

        {/* 1) PDF top KPI strip */}
        <OcHeroKpis
          plantStatus={oc.plantStatus}
          online={online}
          lastTick={lastTick}
          readiness={
            oc.predictionReadiness != null &&
            Number.isFinite(Number(oc.predictionReadiness))
              ? Math.round(Number(oc.predictionReadiness))
              : null
          }
          readinessDelta={null}
          readinessHint={
            oc.predictionReadinessHint ||
            (oc.predictionReadiness != null
              ? "AI/ML-Dienst"
              : "Noch kein AI/ML-Score")
          }
          oee={oc.oee}
          oeeDelta={null}
          oeeHint={oc.oeeHint}
          nextMaintenanceDays={oc.nextMaintenanceDays}
          maintenanceDelta={null}
          maintenanceHint={oc.maintenanceHint}
          alarmsCritical={alarmCounts.critical}
          alarmsWarning={alarmCounts.warning}
        />

        {/* 2) Anlagenübersicht — click a machine card to scope the cockpit */}
        <ProductionMap
          connectedMachine={oc.connectedMachine}
          greyMachines={oc.greyMachines}
          lineMachines={oc.lineMachines}
          remainingCount={remainingCount}
          connectedMachines={oc.connectedMachines}
          totalMachines={oc.totalMachines}
          networkNotes={oc.networkNotes}
          selectedMachineId={activeMachineId}
          onSelectMachine={handleSelectMachine}
        />

        {/* 3) Left stack (Accuracy → Timeline → KI) | Right Live Trends */}
        <div className="oc-main-split">
          <div className="oc-main-left flex flex-col gap-4">
            <AccuracyGaugePanel
              readiness={
                oc.predictionReadiness != null &&
                Number.isFinite(Number(oc.predictionReadiness))
                  ? Math.round(Number(oc.predictionReadiness))
                  : null
              }
              factors={readinessFactors}
              accuracyLocked
            />
            <ProductionTimeline events={timeline} />
            <AiRecommendationCard recommendation={recommendation} />
          </div>
          <div className="oc-main-right min-h-0">
            <LiveTrendsPanel values={trendValues} />
          </div>
        </div>

        <MissingSources
          missingSources={oc.missingSources}
          onConnect={handleOpenWizard}
          activating={wizardSource}
          backendDriven={oc.aggregateOk}
        />
      </div>

      <CurrentRunBar run={runBar} dataCurrent={lastTick} />

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
