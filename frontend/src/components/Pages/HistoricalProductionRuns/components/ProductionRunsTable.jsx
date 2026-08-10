import StatusBadge from "./StatusBadge";
import { useEffect,useState } from "react";
import safeApi from "../../../../api/safeApi";
import { useNavigate } from "react-router-dom";


export default function ProductionRunsTable({}) {

  const navigate = useNavigate();
  const [runs, setRuns] = useState(null);

  const fetchStats = async () => {
    try {

      const res = await safeApi.get(
        "/historical-run/?days=30"
      );

      setRuns(res.data);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);
  

  /* 🔥 FORMAT DURATION */
  const formatDuration = (seconds) => {

    if (!seconds || isNaN(seconds)) {
      return "--";
    }

    const hrs = Math.floor(seconds / 3600);

    const mins = Math.floor((seconds % 3600) / 60);

    return `${hrs}h ${mins}m`;
  };

  /* 🔥 AI STATUS */
  const getAIRating = (scrap) => {

    if (scrap == null) {
      return {
        label: "UNKNOWN",
        className:
          "bg-slate-100 text-slate-600 border-slate-200",
      };
    }

    if (scrap <= 0.3) {
      return {
        label: "NORMAL",
        className:
          "bg-green-100 text-green-700 border-green-200",
      };
    }

    if (scrap <= 1) {
      return {
        label: "WARNING",
        className:
          "bg-yellow-100 text-yellow-700 border-yellow-200",
      };
    }

    return {
      label: "CRITICAL",
      className:
        "bg-red-100 text-red-700 border-red-200",
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">

        <div>

        </div>

        <div className="text-sm text-slate-400">
          Total Entries: {runs?.length}
        </div>

      </div>

      {/* EMPTY */}
      {runs?.length === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-slate-400 text-lg border border-dashed rounded-2xl">
          No Historical Production Runs Found
        </div>
      ) : (

        <div className="h-[600px] overflow-auto rounded-xl border border-slate-200">

          <table className="w-full min-w-[1100px]">

            {/* HEAD */}
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="border-b border-slate-200 text-slate-500 text-sm">

                <th className="text-left py-4 font-semibold bg-white">
                  Run ID
                </th>

                <th className="text-left py-4 font-semibold bg-white">
                  Product
                </th>

                <th className="text-left py-4 font-semibold bg-white">
                  Machine / Line
                </th>

                <th className="text-left py-4 font-semibold bg-white">
                  Start Time
                </th>

                <th className="text-left py-4 font-semibold bg-white">
                  Duration
                </th>

                <th className="text-left py-4 font-semibold bg-white">
                  Scrap %
                </th>

                <th className="text-left py-4 font-semibold bg-white">
                  Status
                </th>

                <th className="text-left py-4 font-semibold bg-white">
                  AI Rating
                </th>

              </tr>
            </thead>

            {/* BODY */}
            <tbody>

              {runs?.map((run) => {

                const ai = getAIRating(run.scrap_percentage);

                return (
                  <tr
                    key={run.run_id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-all duration-200 cursor-pointer"
                    onClick={() =>
                      navigate(`/production-run?runId=${run.run_id}`)
                    }
                  >

                    <td className="py-5 font-bold text-violet-600">
                      #{run.run_id}
                    </td>

                    <td className="font-medium text-slate-700">
                      {run.product || "--"}
                    </td>

                    <td className="text-slate-600">
                      <div className="font-medium">
                        {run.machine_name || "--"}
                      </div>

                      <div className="text-xs text-slate-400 mt-1">
                        Line {run.line_id || "--"}
                      </div>
                    </td>

                    <td className="text-slate-600 whitespace-nowrap">
                      {run.start_time
                        ? new Date(run.start_time).toLocaleString()
                        : "--"}
                    </td>

                    <td className="font-medium text-slate-700">
                      {formatDuration(run.duration)}
                    </td>

                    <td
                      className={`font-semibold ${
                        run.scrap_percentage > 1
                          ? "text-red-600"
                          : run.scrap_percentage > 0.3
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {run.scrap_percentage != null
                        ? `${run.scrap_percentage.toFixed(2)}%`
                        : "--"}
                    </td>

                    <td>
                      <StatusBadge
                        status={run.status || "UNKNOWN"}
                      />
                    </td>

                    <td>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${ai.className}`}
                      >
                        {ai.label}
                      </span>
                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>
      )}
    </div>
  );
}