import { useTranslation } from "react-i18next";

export default function AutoRefreshToggle({ enabled, setEnabled }) {
  const { t } = useTranslation();

  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 border ${
        enabled
          ? "text-purple-500 border-purple-500"
          : "bg-white text-slate-700 border-slate-300"
      }`}
    >
      {enabled
        ? t("liveEstimated.autoRefreshOn")
        : t("liveEstimated.autoRefreshOff")}
    </button>
  );
}
