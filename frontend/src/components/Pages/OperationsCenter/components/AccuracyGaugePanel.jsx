import { Link } from "react-router-dom";

/**
 * PDF panel — titled for design, value is Prediction Readiness from AI/ML only.
 * Module 5 (validated Accuracy) stays locked until model_versions exist.
 */
export default function AccuracyGaugePanel({
  readiness = null,
  factors = [],
  accuracyLocked = true,
}) {
  const value =
    readiness != null && Number.isFinite(Number(readiness))
      ? Math.max(0, Math.min(100, Math.round(Number(readiness))))
      : null;

  return (
    <section className="oc-accuracy-panel h-full min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">
          {accuracyLocked ? "Vorhersagebereitschaft" : "Genauigkeitsquotient"}
        </h2>
        <Link
          to="/executive"
          className="oc-accuracy-pill shrink-0"
          title={
            accuracyLocked
              ? "Genauigkeit nach validierten Modellen"
              : "Gesamtgenauigkeit"
          }
        >
          {accuracyLocked ? "Modul 5 gesperrt" : "Gesamtgenauigkeit"}
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="oc-accuracy-body min-w-0">
        <div className="min-w-0">
          <p className="mb-3 text-sm text-white sm:mb-4">
            {accuracyLocked
              ? "Verbundene Datenquellen"
              : "Was beeinflusst die Genauigkeit?"}
          </p>
          <ul className="space-y-3 sm:space-y-3.5">
            {factors.map((f) => {
              const pct = Math.max(0, Math.min(100, Number(f.value) || 0));
              const barClass =
                f.key === "quality" || (pct > 0 && pct < 55)
                  ? "bg-[#f59e0b]"
                  : pct <= 0
                    ? "bg-slate-600"
                    : "bg-[#22c55e]";
              return (
                <li
                  key={f.key}
                  className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3"
                >
                  <span
                    className="min-w-0 truncate text-[12px] leading-tight text-slate-200 sm:text-[13px]"
                    title={f.label}
                  >
                    {f.label}
                  </span>
                  <div className="h-2.5 min-w-0 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${barClass}`}
                      style={{ width: `${pct}%` }}
                      title={`${pct}%`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="oc-accuracy-divider" aria-hidden />

        <div className="flex min-w-0 flex-col items-center justify-center py-2 lg:py-2 lg:pl-2">
          <AccuracyGauge value={value} />
          {accuracyLocked ? (
            <p className="mt-2 max-w-[14rem] text-center text-[10px] leading-snug text-slate-500">
              Vorhersagebereitschaft vom KI-Dienst, sobald verfügbar.
            </p>
          ) : null}
        </div>
      </div>

      <div className="oc-merkhilfe mt-4 min-w-0 sm:mt-5">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <span className="mt-0.5 shrink-0 text-white" aria-hidden>
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9.5 2.5a3.5 3.5 0 00-3.4 4.2A3.5 3.5 0 004 9.8V12a3 3 0 002 2.8V17a2.5 2.5 0 002.5 2.5h7A2.5 2.5 0 0018 17v-2.2A3 3 0 0020 12V9.8a3.5 3.5 0 00-2.1-3.1A3.5 3.5 0 0014.5 2.5c-1.1 0-2.1.5-2.7 1.3A3.4 3.4 0 009.5 2.5z" />
              <path d="M9 13h.01M15 13h.01M10 17h4" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-white sm:text-[13px]">
              Merkhilfe
            </p>
            <p className="mt-1 break-words text-[12px] leading-relaxed text-slate-300 sm:text-[13px]">
              {value != null
                ? "Wert vom AI/ML-Dienst für die ausgewählte Maschine (Vorhersagebereitschaft)."
                : "Genauigkeit erscheint nach validierten Modellen. Bis dahin Vorhersagebereitschaft, sofern der KI-Dienst sie liefert."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Full yellow→red→green semicircle with % in the center (design, not progressive fill). */
function AccuracyGauge({ value }) {
  const r = 78;
  const stroke = 16;
  const cx = 100;
  const cy = 95;
  const pt = (a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const [x1, y1] = pt(Math.PI);
  const [x2, y2] = pt(0);
  const d = `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;

  return (
    <div className="relative mx-auto w-full max-w-[220px] lg:max-w-[240px]">
      <svg viewBox="0 0 200 125" className="h-auto w-full" aria-hidden>
        <defs>
          <linearGradient id="oc-acc-gauge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#eab308" />
            <stop offset="28%" stopColor="#f59e0b" />
            <stop offset="48%" stopColor="#ef4444" />
            <stop offset="62%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path
          d={d}
          fill="none"
          stroke="url(#oc-acc-gauge)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <text
          x="14"
          y="118"
          fill="#94a3b8"
          fontSize="11"
          fontFamily="system-ui, sans-serif"
        >
          0%
        </text>
        <text
          x="186"
          y="118"
          fill="#94a3b8"
          fontSize="11"
          fontFamily="system-ui, sans-serif"
          textAnchor="end"
        >
          100%
        </text>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-3 sm:pt-4">
        <p className="text-[2rem] font-semibold leading-none tabular-nums tracking-tight text-white sm:text-[2.35rem]">
          {value != null ? `${value}%` : "—"}
        </p>
      </div>
    </div>
  );
}
