import { Link } from "react-router-dom";

/**
 * Produktion Zeitleiste — Heute
 *
 * ≤1024px: vertical stepper (always fully visible, no clipping).
 * >1024px: horizontal track that scrolls inside the card when needed.
 */
export default function ProductionTimeline({ events = [] }) {
  const items = Array.isArray(events) ? events : [];

  return (
    <section className="oc-panel oc-timeline min-w-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="oc-section-title min-w-0">Produktion Zeitleiste — Heute</h2>
        <Link to="/historical-runs" className="oc-text-link shrink-0">
          Alle Ereignisse →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Keine Ereignisse für heute — erscheinen bei Laufstart, Alarmen und Imports.
        </p>
      ) : (
        <>
          {/* Mobile / tablet / narrow desktop column */}
          <ol className="oc-timeline-vertical min-[1025px]:hidden" aria-label="Ereignisse heute">
            {items.map((ev, i) => (
              <TimelineVerticalItem
                key={ev.id || `v-${i}`}
                event={ev}
                isLast={i === items.length - 1}
              />
            ))}
          </ol>

          {/* Wide screens */}
          <div className="oc-timeline-h-wrap hidden min-[1025px]:block">
            <ol
              className="oc-timeline-track"
              aria-label="Ereignisse heute"
              style={{ ["--oc-timeline-count"]: items.length }}
            >
              {items.map((ev, i) => (
                <TimelineHorizontalItem key={ev.id || `h-${i}`} event={ev} />
              ))}
            </ol>
          </div>
        </>
      )}
    </section>
  );
}

function TimelineVerticalItem({ event, isLast }) {
  const tone = toneClass(event.tone);
  const title = event.title || "Ereignis";
  const subtitle = event.subtitle || null;

  return (
    <li className="oc-timeline-v-item">
      <div className="oc-timeline-v-rail" aria-hidden>
        <span className={`oc-timeline-dot ${tone}`} />
        {!isLast ? <span className="oc-timeline-v-line" /> : null}
      </div>
      <div className="oc-timeline-v-body">
        <p className="oc-timeline-time">{event.time || "—"}</p>
        <p className="oc-timeline-title">{title}</p>
        {subtitle ? <p className="oc-timeline-sub">{subtitle}</p> : null}
      </div>
    </li>
  );
}

function TimelineHorizontalItem({ event }) {
  const tone = toneClass(event.tone);
  const title = event.title || "Ereignis";
  const subtitle = event.subtitle || null;
  const tip = subtitle ? `${title} — ${subtitle}` : title;

  return (
    <li className="oc-timeline-h-item">
      <p className="oc-timeline-time">{event.time || "—"}</p>
      <span className={`oc-timeline-dot ${tone}`} aria-hidden />
      <p className="oc-timeline-title" title={tip}>
        {title}
      </p>
      {subtitle ? (
        <p className="oc-timeline-sub" title={subtitle}>
          {subtitle}
        </p>
      ) : null}
    </li>
  );
}

function toneClass(tone) {
  if (tone === "alarm" || tone === "ai") return "oc-timeline-dot--alarm";
  if (tone === "now") return "oc-timeline-dot--now";
  if (tone === "warn") return "oc-timeline-dot--warn";
  return "oc-timeline-dot--ok";
}
