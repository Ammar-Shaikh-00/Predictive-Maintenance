import { useTranslation } from "react-i18next";

export default function Pagination({
  pagination,
  nextPage,
  prevPage,
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-end gap-3 mt-5">

      <button
        onClick={prevPage}
        disabled={pagination.offset === 0}
        className="px-4 py-2 border rounded-lg disabled:opacity-40"
      >
        {t("machineSensorViewer.pagination.previous")}
      </button>

      <button
        onClick={nextPage}
        disabled={!pagination.has_more}
        className="px-4 py-2 border rounded-lg disabled:opacity-40"
      >
        {t("machineSensorViewer.pagination.next")}
      </button>

    </div>
  );
}
