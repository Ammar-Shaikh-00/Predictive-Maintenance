export default function TopHeader() {
  return (
    <div className="flex items-center justify-between">

      <div>
        <h1 className="text-4xl font-bold text-slate-800">
          Produktionshistorie
        </h1>

        <p className="text-slate-500 mt-2">
          Übersicht & Analyse historischer Produktionsläufe
        </p>
      </div>

      <div className="flex gap-3">

        {/* <div className="bg-white rounded-xl border px-5 py-3 shadow-sm">
          KI-Status:
          <span className="ml-2 text-green-600 font-semibold">
            Gesund
          </span>
        </div> */}

      </div>

    </div>
  );
}
