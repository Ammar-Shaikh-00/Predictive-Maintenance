export default function StatusBadge({ status }) {

  const getColor = () => {
    if (status === "RUNNING") {
      return "bg-green-100 text-green-700";
    }

    if (status === "COMPLETED") {
      return "bg-blue-100 text-blue-700";
    }

    if (status === "STOPPED") {
      return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold ${getColor()}`}
    >
      {status}
    </span>
  );
}