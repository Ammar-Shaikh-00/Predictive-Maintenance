import { useState } from "react";
import { IconChevronDown, IconChevronRight } from "./OcIcons";

/**
 * Ereignisverlauf — slim horizontal strip matching the cockpit mockup.
 * Shows two most recent real events; never invents production/material rows.
 */
export default function EventHistoryBar({ events = [] }) {
  const [openId, setOpenId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const real = (Array.isArray(events) ? events : []).filter(
    (ev) => ev && ev.tone !== "now" && ev.id !== "plant-status"
  );
  const preview = real.slice(-2);

  return (
    <section className="oc-event-bar" aria-label="Ereignisverlauf">
      <div className="oc-event-bar__row">
        <h2 className="oc-event-bar__label">Ereignisverlauf</h2>

        {preview.length === 0 ? (
          <div className="oc-event-slot oc-event-slot--empty">
            Keine Ereignisse
          </div>
        ) : (
          preview.map((ev) => (
            <EventSlot
              key={ev.id}
              event={ev}
              open={openId === ev.id}
              onToggle={() =>
                setOpenId((cur) => (cur === ev.id ? null : ev.id))
              }
            />
          ))
        )}

        <button
          type="button"
          className="oc-event-bar__all"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
        >
          Alle Ereignisse anzeigen
          <IconChevronRight className="h-3 w-3" />
        </button>
      </div>

      {showAll ? (
        <ol className="oc-event-bar__all-list">
          {real.length === 0 ? (
            <li className="oc-event-bar__all-empty">Keine weiteren Ereignisse</li>
          ) : (
            real.map((ev) => (
              <li key={`all-${ev.id}`} className="oc-event-bar__all-item">
                <span className={`oc-event-dot ${dotClass(ev.tone)}`} />
                <span className="oc-event-slot__time">{ev.time || "—"}</span>
                <span className="oc-event-bar__all-title">
                  {ev.title || "Ereignis"}
                  {ev.subtitle ? ` — ${ev.subtitle}` : ""}
                </span>
                <span className="oc-event-slot__actor">{ev.actor || "System"}</span>
              </li>
            ))
          )}
        </ol>
      ) : null}
    </section>
  );
}

function EventSlot({ event, open, onToggle }) {
  const title = event.title || "Ereignis";
  const detail = event.subtitle || null;

  return (
    <div className={`oc-event-slot ${open ? "oc-event-slot--open" : ""}`}>
      <button
        type="button"
        className="oc-event-slot__btn"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={`oc-event-dot ${dotClass(event.tone)}`} />
        <span className="oc-event-slot__time">{event.time || "—"}</span>
        <span className="oc-event-slot__title">{title}</span>
        <span className="oc-event-slot__actor">{event.actor || "System"}</span>
        <IconChevronDown className="oc-event-slot__chev h-3 w-3" />
      </button>
      {open && detail ? (
        <p className="oc-event-slot__detail">{detail}</p>
      ) : null}
    </div>
  );
}

function dotClass(tone) {
  if (tone === "alarm" || tone === "ai") return "oc-event-dot--alarm";
  if (tone === "warn") return "oc-event-dot--warn";
  return "oc-event-dot--ok";
}
