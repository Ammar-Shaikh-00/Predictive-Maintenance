/** Lightweight CSS/SVG sparkline — no Recharts on the home page. */
export default function CssSparkline({
  data = [],
  color = "#22c55e",
  width = 96,
  height = 28,
  className = "",
}) {
  if (!data.length) {
    return (
      <div
        className={`rounded bg-white/5 ${className}`}
        style={{ width: "100%", maxWidth: width, height }}
        aria-hidden
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 2;

  const points = data
    .map((v, i) => {
      const x = pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / span) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`h-auto w-full overflow-visible ${className}`}
      style={{ maxHeight: height }}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
