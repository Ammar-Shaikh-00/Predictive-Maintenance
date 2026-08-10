import { useTranslation } from "react-i18next";
import { getBadge, getStdDevColor } from "../../../utils/customDesigns";

export default function StabilityTable({ evaluations }) {
  const { t } = useTranslation();

  const formatFeatureName = (name) =>
    t(`liveEstimated.featureNames.${name}`, { defaultValue: name });

  const formatStatus = (status) =>
    t(`liveEstimated.status.${status}`, { defaultValue: status });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-violet-700">
          {t("liveEstimated.stability.title")}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left pb-4 text-sm font-semibold text-slate-400">
                {t("liveEstimated.stability.parameter")}
              </th>

              <th className="text-left pb-4 text-sm font-semibold text-slate-400">
                {t("liveEstimated.stability.deviation")}
              </th>

              <th className="text-left pb-4 text-sm font-semibold text-slate-400">
                {t("liveEstimated.stability.status")}
              </th>
            </tr>
          </thead>

          <tbody>
            {evaluations.map((e) => (
              <tr
                key={e.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-all duration-200"
              >
                <td className="py-4 text-[15px] font-semibold text-slate-700">
                  {formatFeatureName(e.feature_name)}
                </td>

                <td
                  className={`py-4 text-[15px] font-semibold ${getStdDevColor(e.feature_status)}`}
                >
                  {e.deviation_pct?.toFixed(2)}%
                </td>

                <td className="py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getBadge(
                      e.feature_status
                    )}`}
                  >
                    {formatStatus(e.feature_status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
