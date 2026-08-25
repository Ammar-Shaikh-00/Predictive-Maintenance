export default function StatTile({ label, value, icon, tone = "text-slate-100" }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#1a1f27] p-4">
      <div className="rounded-lg bg-white/5 p-2 text-emerald-400">{icon}</div>
      <div>
        <div className="text-xs font-medium text-slate-400">{label}</div>
        <div className={`mt-1 text-base font-bold ${tone}`}>{value || "--"}</div>
      </div>
    </div>
  );
}
