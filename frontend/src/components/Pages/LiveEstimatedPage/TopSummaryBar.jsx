import { useTranslation } from "react-i18next";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Gauge,
  Cpu,
  Brain,
  Waves,
} from "lucide-react";

import { getBadge } from "../../../utils/customDesigns";
import {
  getStatusColor,
  getMachineStateColor,
  getSystemStateColor,
  getStabilityStatusColor,
} from "../../../utils/customDesigns";

export default function TopSummaryBar({ runEval }) {
  const { t } = useTranslation();

  const translateValue = (value) =>
    value ? t(`liveEstimated.status.${value}`, { defaultValue: value }) : "";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4">
      <Card
        title={t("liveEstimated.summary.system")}
        value={translateValue("HEALTHY")}
        icon={<ShieldCheck size={20} />}
        color={getSystemStateColor("HEALTHY")}
      />

      <Card
        title={t("liveEstimated.summary.detectedState")}
        value={translateValue(runEval.detected_state)}
        icon={<Cpu size={20} />}
        color={getMachineStateColor(runEval?.detected_state)}
      />

      <Card
        title={t("liveEstimated.summary.activeRegime")}
        value={translateValue(runEval.active_regime)}
        icon={<Gauge size={20} />}
        color={getStatusColor(runEval?.overall_status)}
      />

      <Card
        title={t("liveEstimated.summary.overallStatus")}
        value={translateValue(runEval.overall_status)}
        icon={<AlertTriangle size={20} />}
        badge
        badgeClass={getBadge(runEval.overall_status)}
        color={getStatusColor(runEval?.overall_status)}
      />

      <Card
        title={t("liveEstimated.summary.stability")}
        value={translateValue(runEval?.stability_status)}
        icon={<Waves size={20} />}
        color={getStabilityStatusColor(runEval?.stability_status)}
      />

      <Card
        title={t("liveEstimated.summary.driftScore")}
        value={runEval.drift_score?.toFixed(2)}
        icon={<Activity size={20} />}
        color={getStatusColor(runEval?.overall_status)}
      />

      <Card
        title={t("liveEstimated.summary.anomaly")}
        value={runEval.anomaly_score?.toFixed(2)}
        icon={<Brain size={20} />}
        color={getStatusColor(runEval?.overall_status)}
      />
    </div>
  );
}

const Card = ({
  title,
  value,
  icon,
  color,
  badge,
  badgeClass,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
            {title}
          </div>

          {badge ? (
            <div className={`mt-2 inline-flex px-3 py-1 rounded-full text-sm font-semibold border ${badgeClass}`}>
              {value}
            </div>
          ) : (
            <div className={`mt-2 text-xl font-bold ${color}`}>
              {value}
            </div>
          )}
        </div>

        <div className={`${color} p-2 rounded-xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
