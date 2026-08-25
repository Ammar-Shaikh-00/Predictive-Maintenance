import { useTranslation } from "react-i18next";
import { formatDateTime, getStatusTone } from "./productionRunUtils";

export default function RunHeader({
  runData,
  machineName,
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t("productionRun.header.title", { id: runData.id })}
          </h1>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${getStatusTone(runData.status)}`}>
            {runData.status || "running"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-400">
          <span>{t("productionRun.header.started")}: {formatDateTime(runData.start_time)}</span>
          <span className="text-slate-600">|</span>
          <span>{t("productionRun.header.line")}: {runData.line_id || "--"}</span>
          <span className="text-slate-600">|</span>
          <span>{t("productionRun.header.machine")}: {machineName || "--"}</span>
        </div>
      </div>

      <div className="max-w-md rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        <div className="font-semibold text-emerald-200">{t("productionRun.header.storyTitle")}</div>
        <div className="mt-1 text-emerald-100/80">{t("productionRun.header.storySubtitle")}</div>
      </div>
    </div>
  );
}
