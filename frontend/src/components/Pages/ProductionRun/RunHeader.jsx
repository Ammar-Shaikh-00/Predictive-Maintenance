import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDateTime, getStatusTone, isRunCompleted } from "./productionRunUtils";

export default function RunHeader({
  runData,
  machineName,
  completing,
  onComplete,
}) {
  const { t } = useTranslation();
  const completed = isRunCompleted(runData.status);

  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            {t("productionRun.header.title", { id: runData.id })}
          </h1>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${getStatusTone(runData.status)}`}>
            {runData.status || "running"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
          <span>{t("productionRun.header.started")}: {formatDateTime(runData.start_time)}</span>
          <span>|</span>
          <span>{t("productionRun.header.line")}: {runData.line_id || "--"}</span>
          <span>|</span>
          <span>{t("productionRun.header.machine")}: {machineName || "--"}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          <div className="font-bold">{t("productionRun.header.storyTitle")}</div>
          <div className="mt-1 text-violet-700">{t("productionRun.header.storySubtitle")}</div>
        </div>
{/* 
        {!completed && (
          <button
            onClick={onComplete}
            disabled={completing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={18} />
            {completing ? t("productionRun.header.completing") : t("productionRun.header.completeRun")}
          </button>
        )} */}
      </div>
    </div>
  );
}
