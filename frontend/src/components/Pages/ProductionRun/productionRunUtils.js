export const tabs = [
  { id: "context", label: "Context" },
  { id: "process", label: "Process" },
  { id: "quality", label: "Quality" },
  { id: "ai", label: "AI Insights" },
  { id: "material", label: "Material" },
];

export const formatDateTime = (value) => {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const numberOrDash = (value, digits = 1) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : "--";
};

export const isRunCompleted = (status = "") =>
  status.toString().toUpperCase() === "COMPLETED";

export const getStatusTone = (status = "") => {
  const normalized = status.toString().toLowerCase();

  if (["running", "active", "normal", "stable", "ok", "healthy"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (["completed", "complete"].includes(normalized)) {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  if (["warning", "paused", "hold"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (["critical", "stopped", "failed", "unstable"].includes(normalized)) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-slate-50 text-slate-600 border-slate-200";
};
