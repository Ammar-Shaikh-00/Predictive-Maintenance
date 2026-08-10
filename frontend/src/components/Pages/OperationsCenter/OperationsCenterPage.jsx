import { useCallback, useEffect, useMemo, useState } from "react";
import { operationsCenterDemo } from "../../../config/operationsCenterDemo";
import { hasSimulatedContent } from "../../../utils/capabilityEngine";
import safeApi from "../../../api/safeApi";
import DemoBanner from "./components/DemoBanner";
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
 */
export default function OperationsCenterPage() {
  const demo = operationsCenterDemo;
  const oc = useOperationsCenterOverview(demo.pollIntervalMs || 15000);
  const [wizardSource, setWizardSource] = useState(null);
  const [runBar, setRunBar] = useState(null);

  const showDemoBanner = useMemo(
    () =>
      hasSimulatedContent(oc.warnings, oc.risks, oc.machineValues) ||
      !oc.liveFeedOk,
    [oc.warnings, oc.risks, oc.machineValues, oc.liveFeedOk]
  );

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

  const recommendation = useMemo(
    () => pickRecommendation(oc.risks, oc.warnings),
    [oc.risks, oc.warnings]
  );

  const loadRunBar = useCallback(async () => {
    try {
      const res = await safeApi.get("/production-run/order-board");
      if (!res?.fallback && res?.data) {
        setRunBar(mapOrderBoardToRunBar(res.data));
      }
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
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

  const lastTick = oc.lastUpdated || new Date();
  const online = ["PRODUCTION", "READY", "HEATING", "COOLING"].includes(
    String(oc.plantStatus || "").toUpperCase()
  );

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
      <DemoBanner visible={showDemoBanner} />

      <div className="w-full space-y-3 sm:space-y-4">
        {oc.error ? (
          <p className="text-xs text-amber-200/90">{oc.error}</p>
        ) : null}

        {/* 1) PDF top KPI strip */}
        <OcHeroKpis
          plantStatus={oc.plantStatus}
          online={online}
          lastTick={lastTick}
          readiness={Math.round(oc.predictionReadiness)}
          readinessDelta={null}
          oee={null}
          oeeDelta={null}
          nextMaintenanceDays={null}
          alarmsCritical={alarmCounts.critical}
          alarmsWarning={alarmCounts.warning}
        />

        {/* 2) Anlagenübersicht */}
        <ProductionMap
          connectedMachine={oc.connectedMachine}
          greyMachines={oc.greyMachines}
          remainingCount={remainingCount}
          connectedMachines={oc.connectedMachines}
          totalMachines={oc.totalMachines}
          networkNotes={oc.networkNotes}
        />

        {/* 3) Left stack (Accuracy → Timeline → KI) | Right Live Trends */}
        <div className="oc-main-split">
          <div className="oc-main-left flex flex-col gap-4">
            <AccuracyGaugePanel
              readiness={Math.round(oc.predictionReadiness)}
              factors={readinessFactors}
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
