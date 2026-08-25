export const tabs = [
  { id: "context", label: "Kontext" },
  { id: "process", label: "Prozess" },
  { id: "quality", label: "Qualität" },
  { id: "ai", label: "KI-Einblicke" },
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
    return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
  }

  if (["completed", "complete"].includes(normalized)) {
    return "bg-sky-500/15 text-sky-300 border-sky-400/30";
  }

  if (["warning", "paused", "hold"].includes(normalized)) {
    return "bg-amber-500/15 text-amber-300 border-amber-400/30";
  }

  if (["critical", "stopped", "failed", "unstable"].includes(normalized)) {
    return "bg-rose-500/15 text-rose-300 border-rose-400/30";
  }

  return "bg-white/5 text-slate-300 border-white/10";
};
