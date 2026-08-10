export default function DeviationsTable() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">

      <h2 className="text-xl font-bold mb-5">
        Top Deviations
      </h2>

      <table className="w-full">

        <thead>
          <tr className="text-slate-500 text-sm">
            <th className="text-left py-3">Parameter</th>
            <th className="text-left py-3">Deviation</th>
          </tr>
        </thead>

        <tbody>

          <tr className="border-t">
            <td className="py-4">Pressure</td>
            <td className="text-red-600 font-semibold">
              +2.8%
            </td>
          </tr>

        </tbody>

      </table>

    </div>
  );
}