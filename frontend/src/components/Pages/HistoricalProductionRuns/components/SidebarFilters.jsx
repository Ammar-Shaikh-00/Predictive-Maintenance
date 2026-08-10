export default function SidebarFilters() {
  return (
    <div className="w-[280px] bg-[#071226] text-white p-6 border-r border-slate-800">

      <div className="text-2xl font-bold mb-10">
        Predictive Maintenance
      </div>

      <div className="space-y-6">

        <div>
          <div className="text-sm text-slate-400 mb-2">
            Time Range
          </div>

          <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3">
            <option>Last 30 Days</option>
          </select>
        </div>

        <div>
          <div className="text-sm text-slate-400 mb-2">
            Machine / Line
          </div>

          <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3">
            <option>All</option>
          </select>
        </div>

        <button className="w-full bg-violet-600 hover:bg-violet-700 transition-all rounded-xl py-3 font-semibold">
          Apply Filters
        </button>

      </div>

    </div>
  );
}