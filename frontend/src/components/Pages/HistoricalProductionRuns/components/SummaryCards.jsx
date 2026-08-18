import { useEffect, useState } from "react";
import safeApi from "../../../../api/safeApi";
import SummaryCard from "./SummaryCard";

export default function SummaryCards() {

  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    try {

      const res = await safeApi.get(
        "/historical-run/status?days=30"
      );

      setStats(res.data);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  /* 🔥 LOADING */
  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-[120px] rounded-2xl bg-slate-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  /* 🔥 FORMAT DURATION */
  const formatDuration = (seconds) => {

    if (!seconds) return "0m";

    const hrs = Math.floor(seconds / 3600);

    const mins = Math.floor((seconds % 3600) / 60);

    return `${hrs}h ${mins}m`;
  };

  return (
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5">

  <SummaryCard
    title="Total Runs"
    value={stats.total_runs}
    color="text-violet-600"
    strokeColor="#7c3aed"
  />

  <SummaryCard
    title="Average Scrap %"
    value={`${stats.Average_scrap?.toFixed(2)}%`}
    color="text-green-600"
    strokeColor="#16a34a"
  />

  <SummaryCard
    title="Average Run Time"
    value={formatDuration(stats.Average_duration)}
    color="text-blue-600"
    strokeColor="#2563eb"
  />

  <SummaryCard
    title="Normal Runs"
    value={stats.normal_runs}
    color="text-green-600"
    strokeColor="#16a34a"
  />

  <SummaryCard
    title="Warnings"
    value={stats.warning_runs}
    color="text-yellow-600"
    strokeColor="#ca8a04"
  />

  <SummaryCard
    title="Critical Runs"
    value={stats.critical_runs}
    color="text-red-600"
    strokeColor="#dc2626"
  />

</div>
  );
}