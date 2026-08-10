import Sparkline from "./Sparkline";
import { useTranslation } from "react-i18next";
import { getStatusColor, getHashStatusColor } from "../../../utils/customDesigns";

import {
  Gauge,
  Activity,
  Thermometer,
  Cpu,
  Waves,
  Scale,
} from "lucide-react";

export default function ParameterCard({
  parameterKey,
  label,
  value,
  unit,
  baseFeature1,
  feature1,
  baseFeature2,
  feature2,
  evalData,
  trendData,
}) {
  const { t } = useTranslation();
  const status = evalData?.feature_status;
  const translatedStatus = status
    ? t(`liveEstimated.status.${status}`, { defaultValue: status })
    : "";

  const getIcon = () => {
    const lower = (parameterKey || label).toLowerCase();

    if (lower.includes("screw")) {
      return <Gauge size={18} className="text-violet-600" />;
    }

    if (lower.includes("pressure")) {
      return <Activity size={18} className="text-red-500" />;
    }

    if (lower.includes("temperature") || lower.includes("temp")) {
      return <Thermometer size={18} className="text-orange-500" />;
    }

    if (lower.includes("load")) {
      return <Cpu size={18} className="text-blue-500" />;
    }

    if (lower.includes("spread")) {
      return <Waves size={18} className="text-cyan-500" />;
    }

    return <Scale size={18} className="text-slate-500" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-violet-50 p-2 rounded-xl">
            {getIcon()}
          </div>

          <span className="text-sm font-medium text-slate-600">
            {label}
          </span>
        </div>

        <span
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${getStatusColor(
            status
          )}`}
        >
          {translatedStatus}
        </span>
      </div>

      <div>
        <div className="text-3xl text-center font-bold text-slate-800">
          {value?.toFixed(2)}
          <span className="text-base ml-1 text-slate-400 font-medium">
            {unit}
          </span>
        </div>
      </div>

      <div className="w-full">
        <Sparkline data={trendData} color={getHashStatusColor(status)} />
      </div>

      {(baseFeature1 || baseFeature2) && (
        <div className="flex justify-between text-xs text-slate-400 border-t pt-3">
          <div>
            <span className="font-medium text-slate-500">
              {baseFeature1}
            </span>{" "}
            {feature1?.toFixed(2)}
          </div>

          <div>
            <span className="font-medium text-slate-500">
              {baseFeature2}
            </span>{" "}
            {feature2?.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
