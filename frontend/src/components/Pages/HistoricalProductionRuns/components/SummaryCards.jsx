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

    if (!seconds) return "0 Min.";

    const hrs = Math.floor(seconds / 3600);

    const mins = Math.floor((seconds % 3600) / 60);

    return `${hrs} Std. ${mins} Min.`;
  };

  return (
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5">

  <SummaryCard
    title="Läufe gesamt"
    value={stats.total_runs}
    color="text-violet-600"
    strokeColor="#7c3aed"
  />

  <SummaryCard
    title="Durchschn. Ausschuss %"
    value={`${stats.Average_scrap?.toFixed(2)}%`}
    color="text-green-600"
    strokeColor="#16a34a"
  />

  <SummaryCard
    title="Durchschn. Laufzeit"
    value={formatDuration(stats.Average_duration)}
    color="text-blue-600"
    strokeColor="#2563eb"
  />

  <SummaryCard
    title="Normale Läufe"
    value={stats.normal_runs}
    color="text-green-600"
    strokeColor="#16a34a"
  />

  <SummaryCard
    title="Warnungen"
    value={stats.warning_runs}
    color="text-yellow-600"
    strokeColor="#ca8a04"
  />

  <SummaryCard
    title="Kritische Läufe"
    value={stats.critical_runs}
    color="text-red-600"
    strokeColor="#dc2626"
  />

</div>
  );
}
