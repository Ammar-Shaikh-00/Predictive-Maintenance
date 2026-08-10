import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import safeApi from "../../../../api/safeApi";
import { exportCSV } from "../utils/exportCSV";

export default function ExportButtons({
  filters,
  sensorMap,
}) {
  const { t } = useTranslation();

  const handleExportCSV = async () => {

    try {

      if (!filters.machine_id) {
        toast.error(t("machineSensorViewer.errors.selectMachine"));
        return;
      }

      if (!filters.datefrom || !filters.dateTo) {
        toast.error(t("machineSensorViewer.errors.selectDateRange"));
        return;
      }

      toast.loading(t("machineSensorViewer.export.preparing"), {
        id: "export",
      });

      /* FETCH ALL DATA */
        let allRows = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const res = await safeApi.get(
                "/machine-raw-data",
                {
                params: {
                    ...filters,
                    limit: 10000,
                    offset,
                },
            }
        );

        allRows = [
            ...allRows,
            ...(res.data.items || []),
        ];

        hasMore = res.data.has_more;

        offset += 10000;
        }

      if (allRows.length === 0) {

        toast.error(t("machineSensorViewer.export.noData"), {
          id: "export",
        });

        return;
      }

      exportCSV(allRows, sensorMap);

      toast.success(
        t("machineSensorViewer.export.exportedRows", {
          count: allRows.length,
        }),
        {
          id: "export",
        }
      );

    } catch (err) {

      console.error(err);

      toast.error(
        t("machineSensorViewer.export.failed"),
        {
          id: "export",
        }
      );
    }
  };

  return (
    <div className="flex gap-3">

      <button
        onClick={handleExportCSV}
        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl"
      >
        {t("machineSensorViewer.export.button")}
      </button>

    </div>
  );
}