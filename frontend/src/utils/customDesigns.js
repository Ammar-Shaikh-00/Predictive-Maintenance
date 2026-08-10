export const getStatusColor = (status) => {
  if (status === "NORMAL") return "text-green-600 ";
  if (status === "WARNING") return "text-yellow-600 ";
  if (status === "CRITICAL") return "text-red-600 ";
  return "text-gray-600 ";
};

export const getHashStatusColor = (status) => {
  if (status === "NORMAL") return "#16a34a";     // green
  if (status === "WARNING") return "#ca8a04";    // yellow
  if (status === "CRITICAL") return "#dc2626";   // red

  return "#4b5563"; // gray
};

export const getBadge = (status) => {
  if (status === "NORMAL") return "bg-green-100 text-green-700 border-green-200";
  if (status === "WARNING") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (status === "CRITICAL") return "bg-red-100 text-red-700 border-red-200";

  return "bg-slate-100 text-slate-700 border-slate-200";
};
export const getStdDevColor = (status) => {
  if (status === "NORMAL") return " text-green-700 ";
  if (status === "WARNING") return " text-yellow-700 ";
  if (status === "CRITICAL") return " text-red-700 ";

  return " text-slate-700 ";
};


export const getMachineStateColor = (state) => {
  const colors = {
    PRODUCTION: "text-green-600",
    LOW_PRODUCTION: "text-yellow-500",
    READY: "text-blue-600",
    HEATING: "text-orange-600",
    COOLING: "text-cyan-600",
    OFF: "text-gray-500",
  };

  return colors[state] || "text-gray-600";
};

export const getSystemStateColor = (state) => {
  const colors = {
    HEALTHY: "text-green-600",
    NOT_HEALTHY: "text-red-600",
  };

  return colors[state] || "text-gray-600";
};

export const getStabilityStatusColor = (status) => {
  const colors = {
    STABLE: "text-green-600",
    UNSTABLE: "text-red-600",
    TRANSITION: "text-yellow-500",
  };

  return colors[status] || "text-gray-600";
};