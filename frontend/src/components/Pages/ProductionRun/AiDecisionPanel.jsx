import {
  AlertTriangle,
  ClipboardCheck,
  Factory,
  Gauge,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import StatTile from "./StatTile";
import { numberOrDash } from "./productionRunUtils";

export default function AiDecisionPanel({ aiSummary }) {
  const { t } = useTranslation();

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
          <Sparkles size={26} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-950">{t("productionRun.aiUnderstanding.title")}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            {t("productionRun.aiUnderstanding.description")}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatTile label={t("productionRun.ai.detectedState")} value={aiSummary.state} icon={<Factory size={18} />} />
        <StatTile label={t("productionRun.ai.activeRegime")} value={aiSummary.regime} icon={<Gauge size={18} />} />
        <StatTile label={t("productionRun.ai.driftScore")} value={numberOrDash(aiSummary.drift, 2)} icon={<AlertTriangle size={18} />} />
        <StatTile label={t("productionRun.ai.anomalyScore")} value={numberOrDash(aiSummary.anomaly, 2)} icon={<ClipboardCheck size={18} />} />
    </div>

    <div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
      {aiSummary.explanation || t("productionRun.ai.noExplanation")}
    </div>
  </section>
);
}
