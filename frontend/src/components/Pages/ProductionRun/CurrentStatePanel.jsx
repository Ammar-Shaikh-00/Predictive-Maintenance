import {
  Activity,
  CheckCircle2,
  Factory,
  Gauge,
  LineChart,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import StatTile from "./StatTile";
import { numberOrDash } from "./productionRunUtils";

export default function CurrentStatePanel({ aiSummary }) {
  const { t } = useTranslation();

  return (
    <section className="rounded-xl border border-white/10 bg-[#12161e] p-6">
      <h2 className="text-lg font-semibold text-white">{t("productionRun.currentState.title")}</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-5 text-center">
          <div className="text-2xl font-extrabold uppercase text-emerald-300">{aiSummary.status || "--"}</div>
          <div className="mt-2 text-sm font-medium text-slate-400">
            {aiSummary.evaluationStatus || t("productionRun.currentState.liveEvaluation")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatTile label={t("productionRun.ai.detectedState")} value={aiSummary.state} icon={<Factory size={18} />} />
          <StatTile label={t("productionRun.ai.activeRegime")} value={aiSummary.regime} icon={<Gauge size={18} />} />
          <StatTile label={t("productionRun.ai.stability")} value={aiSummary.stability} icon={<Activity size={18} />} tone="text-emerald-300" />
          <StatTile label={t("productionRun.ai.driftScore")} value={numberOrDash(aiSummary.drift, 2)} icon={<LineChart size={18} />} />
          <StatTile label={t("productionRun.ai.anomalyScore")} value={numberOrDash(aiSummary.anomaly, 2)} icon={<Sparkles size={18} />} />
          <StatTile label={t("productionRun.ai.confidence")} value={aiSummary.confidence ? `${numberOrDash(aiSummary.confidence * 100, 0)}%` : "--"} icon={<CheckCircle2 size={18} />} />
        </div>
      </div>

      <div className="mt-5">
        <h3 className="font-semibold text-white">{t("productionRun.ai.explanation")}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {aiSummary.explanation || t("productionRun.ai.noExplanation")}
        </p>
      </div>
    </section>
  );
}
