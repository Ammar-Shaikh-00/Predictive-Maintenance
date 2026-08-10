export default function StatTile({ label, value, icon, tone = "text-slate-800" }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-4">
      <div className="rounded-lg bg-slate-50 p-2 text-violet-600">{icon}</div>
      <div>
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className={`mt-1 text-base font-bold ${tone}`}>{value || "--"}</div>
      </div>
    </div>
  );
}
