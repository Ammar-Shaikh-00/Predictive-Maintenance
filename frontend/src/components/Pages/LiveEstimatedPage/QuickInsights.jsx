// QuickInsights.jsx

import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  AlertTriangle,
  Activity,
  TrendingUp,
  Info,
} from "lucide-react";

export default function QuickInsights({
  runEval,
  evaluations,
  features,
}) {
  const { t } = useTranslation();

  const getFeature = (name) =>
    evaluations.find((e) => e.feature_name === name);

  const pressureEval = getFeature("pressure");
  const tempSpreadEval = getFeature("temp_spread");

  const performanceIndex =
    (
      (1 - runEval.anomaly_score) *
      (1 - runEval.drift_score)
    ) * 100;

  const insights = [
    {
      title: t("liveEstimated.insights.processStable.title"),
      description:
        runEval.stability_status === "STABLE"
          ? t("liveEstimated.insights.processStable.stable")
          : t("liveEstimated.insights.processStable.unstable"),

      icon: CheckCircle2,

      color:
        runEval.stability_status === "STABLE"
          ? "text-emerald-600"
          : "text-red-600",

      bg:
        runEval.stability_status === "STABLE"
          ? "bg-emerald-50 border-emerald-100"
          : "bg-red-50 border-red-100",
    },

    {
      title: t("liveEstimated.insights.tempSpread.title"),
      description:
        features.temp_spread < 1
          ? t("liveEstimated.insights.tempSpread.stable")
          : t("liveEstimated.insights.tempSpread.increasing"),

      icon: Info,

      color:
        tempSpreadEval?.feature_status === "WARNING"
          ? "text-yellow-600"
          : "text-blue-600",

      bg:
        tempSpreadEval?.feature_status === "WARNING"
          ? "bg-yellow-50 border-yellow-100"
          : "bg-blue-50 border-blue-100",
    },

    {
      title: t("liveEstimated.insights.monitorPressure.title"),
      description:
        pressureEval?.feature_status === "WARNING"
          ? t("liveEstimated.insights.monitorPressure.warning")
          : t("liveEstimated.insights.monitorPressure.normal"),

      icon:
        pressureEval?.feature_status === "WARNING"
          ? AlertTriangle
          : Activity,

      color:
        pressureEval?.feature_status === "WARNING"
          ? "text-yellow-600"
          : "text-emerald-600",

      bg:
        pressureEval?.feature_status === "WARNING"
          ? "bg-yellow-50 border-yellow-100"
          : "bg-emerald-50 border-emerald-100",
    },

    {
      title: t("liveEstimated.insights.performance.title"),
      description: (
        <>
          {t("liveEstimated.insights.performance.description")}{" "}
          <span className="font-bold text-violet-600">
            {performanceIndex.toFixed(1)}%
          </span>
        </>
      ),

      icon: TrendingUp,
      color: "text-violet-600",
      bg: "bg-violet-50 border-violet-100",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-violet-700">
          {t("liveEstimated.insights.title")}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {insights.map((item, idx) => {
          const Icon = item.icon;

          return (
            <div
              key={idx}
              className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-md ${item.bg}`}
            >
              <div className="flex items-start gap-4">
                <div className={`${item.color}`}>
                  <Icon size={24} strokeWidth={2.2} />
                </div>

                <div className="flex-1">
                  <div className={`font-bold text-base ${item.color}`}>
                    {item.title}
                  </div>

                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
