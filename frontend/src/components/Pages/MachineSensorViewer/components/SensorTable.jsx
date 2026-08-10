import { useTranslation } from "react-i18next";
import Pagination from "./Pagination";
import { Info } from "lucide-react";

export default function SensorTable({
  rows,
  sensorMap,
  pagination,
  nextPage,
  prevPage,
  loading,
}) {
  const { t } = useTranslation();

  const columns = Object.keys(sensorMap);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">

      <h2 className="text-xl font-bold mb-5">
        {t("machineSensorViewer.table.title")}
      </h2>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          {t("machineSensorViewer.table.loading")}
        </div>
      ) : rows.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-slate-400">
          {t("machineSensorViewer.table.noData")}
        </div>
      ) : (
        <>
          <div className="overflow-auto max-h-[500px] border border-slate-200 rounded-2xl">

            <table className="w-full min-w-[1400px]">

              <thead className="sticky top-0 z-20 bg-white shadow-sm">

                <tr className="border-b border-slate-200 text-lg text-slate-500">

                  <th className="text-left py-3">
                    {t("machineSensorViewer.table.timestamp")}
                  </th>

                  {columns.map((col) => (
                      <th
                        key={col}
                        className="text-left px-4 py-4 min-w-[220px] border-b bg-slate-50"
                      >
                        <div className="space-y-2">

                          {/* Sensor Name + tooltip */}
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-800 text-sm">
                              {sensorMap[col].name}
                            </h4>

                            <div className="relative group">
                              <Info
                                size={14}
                                className="text-slate-400 cursor-pointer hover:text-blue-500 transition"
                              />

                              {/* Tooltip */}
                              <div
                                className="
                                  absolute z-50 left-5 top-0
                                  w-72 p-3
                                  rounded-xl
                                  bg-slate-900
                                  text-white
                                  text-xs
                                  shadow-xl
                                  opacity-0
                                  invisible
                                  group-hover:visible
                                  group-hover:opacity-100
                                  transition-all duration-200
                                "
                              >
                                <div className="font-semibold mb-1">
                                  {t("machineSensorViewer.table.description")}
                                </div>

                                {sensorMap[col].description}
                              </div>
                            </div>
                          </div>

                          {/* Metadata pills */}
                          <div className="flex flex-wrap gap-2">

                            <span className="
                              px-2 py-1
                              text-xs
                              rounded-full
                              bg-blue-100
                              text-blue-700
                              font-medium
                            ">
                              {t("machineSensorViewer.table.unit")}: {sensorMap[col].unit}
                            </span>

                            <span className="
                              px-2 py-1
                              text-xs
                              rounded-full
                              bg-slate-100
                              text-slate-700
                              font-medium
                            ">
                              {t("machineSensorViewer.table.source")}: {sensorMap[col].map_val}
                            </span>

                          </div>

                        </div>
                      </th>
                    ))}

                </tr>

              </thead>

              <tbody className="bg-white">

                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 hover:bg-slate-50 text-center"
                  >

                    <td className="py-3 whitespace-nowrap">
                      {new Date(
                        row.timestamp
                      ).toLocaleString()}
                    </td>

                    {columns.map((col) => (
                      <td key={col}>
                        {row[col]}
                      </td>
                    ))}

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

          <Pagination
            pagination={pagination}
            nextPage={nextPage}
            prevPage={prevPage}
          />
        </>
      )}

    </div>
  );
}
