import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity,
  Factory,
  Gauge,
  LineChart,
  Thermometer,
  Waves,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import MaterialProfileTab from "./MaterialProfileTab";
import RunHeader from "./RunHeader";
import ContextOverview from "./ContextOverview";
import CurrentStatePanel from "./CurrentStatePanel";
import ProcessMetrics from "./ProcessMetrics";
import QualityOverview from "./QualityOverview";
import ReferenceTable from "./ReferenceTable";
import AiDecisionPanel from "./AiDecisionPanel";
import safeApi from "../../../api/safeApi";
import { numberOrDash, tabs } from "./productionRunUtils";

export default function ProductionRunPage({ runId }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("context");
  const [runData, setRunData] = useState(null);
  const [processData, setProcessData] = useState([]);
  const [qualityData, setQualityData] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [featureEvaluations, setFeatureEvaluations] = useState([]);
  const [machineName, setMachineName] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchProductionRun = useCallback(async (run_id) => {
    if (!run_id) return;

    setLoading(true);

    try {
      const [runRes, qualityRes] = await Promise.allSettled([
        safeApi.get(`/production-run/${run_id}`),
        safeApi.get(`/production-run/${run_id}/quality`),
      ]);

      if (runRes.status === "fulfilled") {
        const run = runRes.value.data;

        setRunData(run);
        setMachineName("");

        if (run?.machine_id) {
          const machineRes = await safeApi.get(`/machines/${run.machine_id}`);
          setMachineName(machineRes.data?.name || "");
        }
      }

      setQualityData(qualityRes.status === "fulfilled" ? qualityRes.value.data || null : null);

      if (runRes.status === "rejected") {
        throw runRes.reason;
      }
    } catch (error) {
      console.error(error);
      toast.error(t("productionRun.messages.fetchCurrentFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchLiveData = useCallback(async (run_id) => {
    if (!run_id) return;

    try {
      const [windowRes, runEvalRes] = await Promise.all([
        safeApi.get(`/live-process-windows?limit=100&production_run_id=${run_id}`),
        safeApi.get(`/live-run-evaluations?limit=1&production_run_id=${run_id}`),
      ]);

      const windows = windowRes.data || [];
      const latestWindow = windows[0];
      let latestRunEval = runEvalRes.data?.[0] || null;

      if (!latestRunEval && latestWindow?.id) {
        const windowRunEvalRes = await safeApi.get(
          `/live-run-evaluations?limit=1&live_process_window_id=${latestWindow.id}`
        );
        latestRunEval = windowRunEvalRes.data?.[0] || null;
      }

      setProcessData(windows);
      setAiData(latestRunEval);

      if (latestWindow?.id) {
        const featureRes = await safeApi.get(
          `/live-feature-evaluations/reference-data?prod_run_id=${run_id}`
        );
        setFeatureEvaluations(featureRes.data || []);
      } else {
       
        setFeatureEvaluations([]);
      }
    } catch (error) {
      console.error(error);
      toast.error(t("productionRun.messages.fetchLiveFailed"));
    }
  }, [t]);

  useEffect(() => {
    fetchProductionRun(runId);
  }, [runId, fetchProductionRun]);

  useEffect(() => {
    fetchLiveData(runId);

    const interval = setInterval(() => {
      fetchLiveData(runId);
    }, 5000);

    return () => clearInterval(interval);
  }, [runId, fetchLiveData]);

  const latestProcess = useMemo(() => {
    if (!processData?.length) return {};
    return processData[0];
  }, [processData]);

  const aiSummary = useMemo(() => {
    const source = aiData || runData || {};

    return {
      state: source?.detected_state ,
      regime: source?.active_regime ,
      status: source?.overall_status || source.status ,
      stability: source?.stability_status ,
      drift: source?.drift_score,
      anomaly: source?.anomaly_score,
      confidence: source?.confidence,
      explanation: source?.explanation_text,
      evaluationStatus: source?.evaluation_status,
    };
  }, [aiData, runData]);

  const qualitySummary = qualityData || {};
  const editable = true;

  const getFeatureEvaluation = (featureName) =>
    featureEvaluations.find((item) => item.feature_name === featureName);

  const formatSigned = (value, digits = 2) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "--";
    return `${numeric > 0 ? "+" : ""}${numeric.toFixed(digits)}`;
  };

  const formatTargetRange = (evaluation, digits = 1) => {
    if (!evaluation) return "--";
    return `${numberOrDash(evaluation.baseline_warning_low, digits)} - ${numberOrDash(
      evaluation.baseline_warning_high,
      digits
    )}`;
  };

  const metricConfig = [
    {
      featureName: "pressure_mean",
      titleKey: "productionRun.metrics.pressure",
      valueKey: "avg_pressure",
      value: latestProcess.avg_pressure,
      digits: 1,
      rangeDigits: 1,
      icon: <Activity size={16} />,
      color: "text-teal-400",
    },
    {
      featureName: "screw_speed_mean",
      titleKey: "productionRun.metrics.screwSpeed",
      valueKey: "avg_speed",
      value: latestProcess.avg_speed,
      digits: 1,
      rangeDigits: 1,
      icon: <Gauge size={16} />,
      color: "text-sky-400",
    },
    {
      featureName: "temperature_mean",
      title: "Temperature (°C)",
      titleKey: "productionRun.metrics.temperature",
      valueKey: "avg_temp",
      value: latestProcess.avg_temp,
      digits: 1,
      rangeDigits: 1,
      icon: <Thermometer size={16} />,
      color: "text-amber-400",
    },
    {
      featureName: "load_mean",
      titleKey: "productionRun.metrics.load",
      valueKey: "avg_load",
      value: latestProcess.avg_load,
      digits: 1,
      rangeDigits: 1,
      icon: <Factory size={16} />,
      color: "text-emerald-400",
    },
    {
      featureName: "temp_spread",
      title: "Temp. spread (°C)",
      titleKey: "productionRun.metrics.tempSpread",
      valueKey: "temp_spread",
      value: latestProcess.temp_spread,
      digits: 2,
      rangeDigits: 2,
      icon: <Waves size={16} />,
      color: "text-cyan-400",
    },
    {
      featureName: "pressure_per_rpm",
      titleKey: "productionRun.metrics.pressurePerRpm",
      valueKey: "pressure_per_rpm",
      value: latestProcess.pressure_per_rpm,
      digits: 2,
      rangeDigits: 2,
      icon: <LineChart size={16} />,
      color: "text-sky-400",
    },
  ];

  const processMetrics = metricConfig.map((metric) => {
    const evaluation = getFeatureEvaluation(metric.featureName);
    const trendData = [...processData]
      .reverse()
      .map((item) => ({ value: Number(item?.[metric.valueKey]) }))
      .filter((item) => Number.isFinite(item.value));

    return {
      title: t(metric.titleKey),
      value: numberOrDash(metric.value ?? evaluation?.current_value, metric.digits),
      delta: formatSigned(evaluation?.deviation_abs, metric.digits),
      range: formatTargetRange(evaluation, metric.rangeDigits),
      icon: metric.icon,
      color: metric.color,
      trendData,
    };
  });

  const referenceRows = metricConfig.map((metric) => {
    const evaluation = getFeatureEvaluation(metric.featureName);

    return {
      parameter: t(metric.titleKey),
      current: numberOrDash(evaluation?.current_value, metric.digits),
      reference: numberOrDash(evaluation?.baseline_mean, metric.digits),
      deviation: `${formatSigned(evaluation?.deviation_abs, metric.digits)} (${formatSigned(
        evaluation?.deviation_pct,
        1
      )}%)`,
      status: evaluation?.feature_status || "--",
    };
  });

  if (!runId) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-[#12161e] p-10 text-center text-slate-400">
        {t("productionRun.empty")}
      </div>
    );
  }

  if (loading && !runData) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#12161e] p-10 text-center text-slate-400">
        {t("productionRun.loading")}
      </div>
    );
  }

  if (!runData) return null;

  return (
    <div className="space-y-5 text-slate-100">
      <RunHeader
        runData={runData}
        machineName={machineName}
      />

      <div className="rounded-xl border border-white/10 bg-[#12161e]">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-36 border-b-2 px-6 py-4 text-sm font-semibold uppercase tracking-wide transition ${
                activeTab === tab.id
                  ? "border-emerald-400 text-emerald-300"
                  : "border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {t(`productionRun.tabs.${tab.id}`)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "context" && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
            <ContextOverview
              runData={runData}
              editable={editable}
              
              onRunUpdate={setRunData}
            />
            <CurrentStatePanel aiSummary={aiSummary} />
          </div>

          <ProcessMetrics metrics={processMetrics} />

          <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
            <QualityOverview
              runId={runId}
              quality={qualitySummary}
              editable={editable}
              onQualityUpdate={setQualityData}
            />
            <ReferenceTable rows={referenceRows} activeRegime={aiSummary.regime} />
          </div>
        </div>
      )}

      {activeTab === "process" && <ProcessMetrics metrics={processMetrics} />}
      {activeTab === "quality" && (
        <QualityOverview
          runId={runId}
          quality={qualitySummary}
          editable={editable}
          expanded
          onQualityUpdate={setQualityData}
        />
      )}
      {activeTab === "ai" && <AiDecisionPanel aiSummary={aiSummary} />}
      {activeTab === "material" && (
        <section className="rounded-xl border border-white/10 bg-[#12161e] p-6">
          <MaterialProfileTab runId={runId} />
        </section>
      )}
    </div>
  );
}
