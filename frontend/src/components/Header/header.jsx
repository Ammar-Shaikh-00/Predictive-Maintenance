import { useEffect, useState } from "react";
import safeApi from "../../api/safeApi";
import { useTranslation } from "react-i18next";

function StatusChip({ status, label, industrial }) {
  const map = industrial
    ? {
        available: "text-emerald-300 bg-emerald-500/15 ring-emerald-500/30",
        unavailable: "text-amber-300 bg-amber-500/15 ring-amber-500/30",
        error: "text-rose-300 bg-rose-500/15 ring-rose-500/30",
      }
    : {
        available: "text-green-700 bg-green-50 ring-green-600/20",
        unavailable: "text-amber-700 bg-amber-50 ring-amber-600/20",
        error: "text-red-700 bg-red-50 ring-red-600/20",
      };

  const icon =
    status === "available" ? (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ) : status === "error" ? (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ) : (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
      </svg>
    );

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${map[status]}`}
    >
      {icon}
      {label}
    </span>
  );
}

function AlertToggle({ status, onToggle, loading, industrial }) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 items-center">
      <span className={`text-xs ${industrial ? "text-slate-400" : ""}`}>
        {t("alertService")}
      </span>
      <button
        onClick={onToggle}
        disabled={loading}
        className={`flex items-center gap-2 px-1 py-1 rounded-xl border text-sm font-medium transition ${
          industrial
            ? status
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
            : status
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
        } ${loading ? "opacity-50 cursor-not-allowed" : industrial ? "hover:bg-white/5" : "hover:scale-105"}`}
      >
        <div
          className={`w-7 h-3 flex items-center rounded-full p-1 transition ${
            status ? "bg-emerald-500" : industrial ? "bg-slate-600" : "bg-gray-300"
          }`}
        >
          <div
            className={`bg-white w-3 h-3 rounded-full shadow transform transition ${
              status ? "translate-x-3" : ""
            }`}
          />
        </div>
        <span className="text-xs">{status ? t("active") : t("inactive")}</span>
      </button>
    </div>
  );
}

function UserMenu({ user, role, onLogout, industrial }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const name = user?.name || user?.email || t("user");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
          industrial
            ? "border border-white/10 bg-[#1a1f27] text-slate-200 hover:bg-white/5"
            : "shadow-md bg-white hover:bg-gray-50"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            industrial ? "bg-emerald-500/20" : "bg-purple-100"
          }`}
        >
          <span
            className={`text-sm font-medium ${
              industrial ? "text-emerald-300" : "text-purple-700"
            }`}
          >
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="hidden sm:inline text-sm">{role}</span>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-2 w-48 rounded-lg shadow z-50 border ${
            industrial
              ? "bg-[#141820] border-white/10 text-slate-200"
              : "bg-white"
          }`}
        >
          <div className={`px-4 py-3 border-b ${industrial ? "border-white/10" : ""}`}>
            <div className="text-sm font-medium">
              {t("role")}: {role}
            </div>
            <div
              className={`text-xs truncate ${
                industrial ? "text-slate-500" : "text-gray-500"
              }`}
            >
              {user?.email}
            </div>
          </div>
          <button
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
            className={`w-full px-4 py-2 text-left text-sm ${
              industrial ? "hover:bg-white/5" : "hover:bg-gray-50"
            }`}
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header({
  appName = "My App",
  tagline = "Tagline here",
  user = {},
  role = "ADMIN",
  aiStatus = null,
  aiLoading = false,
  onLogout = () => {},
  onMenuClick,
  backendStatus,
  variant = "industrial",
}) {
  const { t } = useTranslation();
  const industrial = variant === "industrial";

  const getStatus = () => {
    if (aiLoading) return "unavailable";
    if (!aiStatus) return "unavailable";
    if (aiStatus === "healthy" || aiStatus === "operational") return "available";
    if (aiStatus === "error" || aiStatus === "degraded") return "error";
    return "unavailable";
  };

  const [alertStatus, setAlertStatus] = useState(null);
  const [loadingToggle, setLoadingToggle] = useState(false);

  useEffect(() => {
    const fetchAlertStatus = async () => {
      try {
        const res = await safeApi.get("/alert-service");
        setAlertStatus(res.data?.status ?? res.data);
      } catch (err) {
        console.error("Failed to fetch alert status", err);
      }
    };
    fetchAlertStatus();
  }, [backendStatus]);

  const handleToggle = async () => {
    try {
      setLoadingToggle(true);
      const res = await safeApi.patch("/alert-service/toggle");
      setAlertStatus(res.data?.status ?? res.data);
    } catch (err) {
      console.error("Toggle failed", err);
    } finally {
      setLoadingToggle(false);
    }
  };

  const statusLabel = aiLoading
    ? t("loading")
    : t("kiStatus", { status: aiStatus || t("unknown") });

  return (
    <header className={industrial ? "mb-2 sm:mb-4" : "mb-6"}>
      <div
        className={`mx-0 mt-2 flex flex-col gap-3 rounded-xl p-3 sm:mx-0 sm:mt-3 sm:gap-4 sm:p-4 lg:m-0 lg:flex-row lg:items-center lg:justify-between lg:p-5 ${
          industrial
            ? "border border-white/10 bg-[#141820] text-slate-100 shadow-none"
            : "bg-white shadow-sm"
        }`}
      >
        <div className="flex items-start gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className={`lg:hidden mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                industrial
                  ? "border border-white/10 bg-[#1a1f27] text-slate-200"
                  : "shadow-md"
              }`}
              aria-label="Menü öffnen"
            >
              ☰
            </button>
          )}
          <div className="min-w-0">
            <h1
              className={`text-lg font-semibold tracking-tight sm:text-xl lg:text-2xl ${
                industrial
                  ? "text-slate-50"
                  : "bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent"
              }`}
            >
              {appName}
            </h1>
            <div
              className={`mt-1 text-[10px] uppercase tracking-wider sm:text-xs ${
                industrial ? "text-slate-500" : "text-gray-500"
              }`}
            >
              {tagline}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">

          {alertStatus !== null && (
            <AlertToggle
              status={alertStatus}
              onToggle={handleToggle}
              loading={loadingToggle}
              industrial={industrial}
            />
          )}

          <StatusChip status={getStatus()} label={statusLabel} industrial={industrial} />
          <UserMenu
            user={user}
            role={role}
            onLogout={onLogout}
            industrial={industrial}
          />
        </div>
      </div>
    </header>
  );
}
