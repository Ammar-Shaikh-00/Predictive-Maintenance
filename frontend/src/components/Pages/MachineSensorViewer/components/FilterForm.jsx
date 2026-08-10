import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function FilterForm({
  filters,
  setFilters,
  machines,
  onSearch,
}) {
  const { t } = useTranslation();

  const handleSearch = () => {

    if (!filters.machine_id) {
      toast.error(t("machineSensorViewer.errors.machineRequired"));
      return;
    }

    if (!filters.datefrom) {
      toast.error(t("machineSensorViewer.errors.startDateRequired"));
      return;
    }

    if (!filters.dateTo) {
      toast.error(t("machineSensorViewer.errors.endDateRequired"));
      return;
    }

    if (
      new Date(filters.datefrom) >
      new Date(filters.dateTo)
    ) {
      toast.error(t("machineSensorViewer.errors.startAfterEnd"));

      return;
    }

    onSearch();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">

        {/* MACHINE */}
        <div>
          <label className="text-sm font-medium text-slate-600">
            {t("machineSensorViewer.filters.machine")}
          </label>

          <select
            value={filters.machine_id}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                machine_id: e.target.value,
              }))
            }
              className="
                        w-full mt-2
                        rounded-xl
                        px-4 py-3
                        bg-white
                        shadow-md
                        hover:shadow-lg
                        focus:outline-none
                        focus:ring-2
                        focus:ring-blue-500/30
                        focus:shadow-xl
                        transition-all
                        duration-300
                      "
          >
            <option value="">
              {t("machineSensorViewer.filters.selectMachine")}
            </option>

            {machines.map((m) => (
              <option
                key={m.id}
                value={m.id}
              >
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* LINE */}
        <div>
          <label className="text-sm font-medium text-slate-600">
            {t("machineSensorViewer.filters.lineId")}
          </label>

          <select
            value={filters.line_id}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                line_id: Number(e.target.value),
              }))
            }
            className="
                        w-full mt-2
                        rounded-xl
                        px-4 py-3
                        bg-white
                        shadow-md
                        hover:shadow-lg
                        focus:outline-none
                        focus:ring-2
                        focus:ring-blue-500/30
                        focus:shadow-xl
                        transition-all
                        duration-300
                      "
          >
            <option value={29}>
              29
            </option>
          </select>
        </div>

        {/* FROM */}
        <div>
          <label className="text-sm font-medium text-slate-600">
            {t("machineSensorViewer.filters.from")}
          </label>

          <input
            type="datetime-local"
            value={filters.datefrom}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                datefrom: e.target.value,
              }))
            }
            className="
                        w-full mt-2
                        rounded-xl
                        px-4 py-3
                        bg-white
                        shadow-md
                        hover:shadow-lg
                        focus:outline-none
                        focus:ring-2
                        focus:ring-blue-500/30
                        focus:shadow-xl
                        transition-all
                        duration-300
                      "
          />
        </div>

        {/* TO */}
        <div>
          <label className="text-sm font-medium text-slate-600">
            {t("machineSensorViewer.filters.to")}
          </label>

          <input
            type="datetime-local"
            value={filters.dateTo}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                dateTo: e.target.value,
              }))
            }
            className="
                        w-full mt-2
                        rounded-xl
                        px-4 py-3
                        bg-white
                        shadow-md
                        hover:shadow-lg
                        focus:outline-none
                        focus:ring-2
                        focus:ring-blue-500/30
                        focus:shadow-xl
                        transition-all
                        duration-300
                      "
          />
        </div>

        {/* BUTTON */}
        <div className="flex items-end">

          <button
            onClick={handleSearch}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-2.5 font-medium"
          >
            {t("machineSensorViewer.filters.loadData")}
          </button>

        </div>

      </div>

    </div>
  );
}