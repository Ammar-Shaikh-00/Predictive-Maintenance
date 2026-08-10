const MiniSparkline = ({ color = "#14b8a6" }) => (
  <svg viewBox="0 0 120 32" className="h-9 w-full" aria-hidden="true">
    <polyline
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      points="-32,10 -25,20 -12,1 0,20 12,12 24,17 36,14 48,22 60,16 72,19 84,10 96,15 108,13 120,18 130,12 140,12 155,1 165,25 175,10"
    />
  </svg>
);


export default function SummaryCard({
  title,
  value,
  color,
  strokeColor
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">

      <div className="text-sm text-slate-500">
        {title}
      </div>

      <div className={`mt-3 text-4xl font-bold ${color}`}>
        {value}
      </div>

      <div>
        <MiniSparkline color={strokeColor} />
      </div>

    </div>
  );
}