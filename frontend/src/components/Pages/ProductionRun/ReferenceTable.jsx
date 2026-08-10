import { useTranslation } from "react-i18next";
import { getStatusTone } from "./productionRunUtils";

export default function ReferenceTable({ rows, activeRegime }) {
  const { t } = useTranslation();
  // console.log("Rows: ")
  // console.log(rows);
  // console.log("ActiveRegime: ")
  // console.log(activeRegime);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">
        {t("productionRun.reference.title", { regime: activeRegime || "--" })}
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
              <th className="py-3">{t("productionRun.reference.parameter")}</th>
              <th className="py-3">{t("productionRun.reference.currentValue")}</th>
              <th className="py-3">{t("productionRun.reference.referenceMean")}</th>
              <th className="py-3">{t("productionRun.reference.deviation")}</th>
              <th className="py-3">{t("productionRun.reference.status")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ parameter, current, reference, deviation, status }) => (
              <tr key={parameter} className="border-b border-slate-100 last:border-0">
                <td className="py-3 font-medium text-slate-800">{parameter}</td>
                <td className="py-3 text-slate-700">{current}</td>
                <td className="py-3 text-slate-700">{reference}</td>
                <td className="py-3 text-slate-700">{deviation}</td>
                <td className="py-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusTone(status)}`}>
                    {status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
