import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import safeApi from "../../../api/safeApi";
import ParameterCards from "./ParameterCards";
import CombinedChart from "./CombinedChart";
import StabilityTable from "./StabilityTable";
import QuickInsights from "./QuickInsights";
import TopSummaryBar from "./TopSummaryBar";
import AutoRefreshToggle from "./AutoRefreshToggle";

export default function LiveEstimatedPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      const windowRes = await safeApi.get("/live-process-windows?limit=1");

      const liveProcessWindowId = windowRes.data[0]?.id;

      const [featureRes, evalResInitial, runEvalRes, historyRes] =
        await Promise.all([
          safeApi.get("/window-features?limit=1"),

          safeApi.get(
            `/live-feature-evaluations?live_process_window_id=${liveProcessWindowId}`
          ),

          safeApi.get("/live-run-evaluations?limit=1"),

          safeApi.get("/live-process-windows?limit=100"),
        ]);

      let evaluations = evalResInitial.data;


      /* 🔥 REFETCH CHECK */
      while (evaluations.length < 7) {

        console.warn(
          "Incomplete evaluations received. Refetching..."
        );

        const retryEvalRes = await safeApi.get(
          `/live-feature-evaluations?live_process_window_id=${liveProcessWindowId}`
        );

        evaluations = retryEvalRes.data;
        if(evaluations.length >= 7){
          break;
        }
      }

      setData({
        window: windowRes.data[0],
        features: featureRes.data[0],
        evaluations,
        runEval: runEvalRes.data[0],
        history: historyRes.data,
      });

      setLastUpdated(new Date());

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading || !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-lg font-semibold text-slate-600">
          {t("liveEstimated.loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-purple-500">
            {t("liveEstimated.title")}
          </h2>

          <p className="text-slate-500 mt-1 text-sm">
            {t("liveEstimated.lastRefreshedAt")}{" "}
            {lastUpdated
              ? lastUpdated.toLocaleTimeString()
              : "--:--:--"}
          </p>
        </div>

        <AutoRefreshToggle
          enabled={autoRefresh}
          setEnabled={setAutoRefresh}
        />
      </div>

      {/* TOP SUMMARY */}
      <TopSummaryBar
        runEval={data.runEval}
        window={data.window}
      />

      <h3 className="text-xl font-bold text-purple-500">
        {t("liveEstimated.processParameters")}
      </h3>

      {/* PARAMETER CARDS */}
      <ParameterCards
        features={data.features}
        evaluations={data.evaluations}
        trendHistory={data.history}
      />

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <div className="xl:col-span-2">
          <CombinedChart data={data.history} />
        </div>

        <div>
          <StabilityTable evaluations={data.evaluations} />
        </div>

      </div>

      <QuickInsights
        runEval={data.runEval}
        evaluations={data.evaluations}
        features={data.features}
      />

    </div>
  );
}
