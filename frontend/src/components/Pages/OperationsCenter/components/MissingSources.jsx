import { useState } from "react";
import { sourceLabel } from "../../../../utils/capabilityEngine";

/**
 * Fehlende Datenquellen — standardmäßig eingeklappt.
 */
export default function MissingSources({
  missingSources = [],
  onConnect,
  activating = null,
  backendDriven = false,
}) {
  const [open, setOpen] = useState(false);
  const count = missingSources.length;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#141820] p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 transition-transform ${
            open ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
            <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold uppercase tracking-wider text-slate-300">
            Fehlende Datenquellen
            {count > 0 ? (
              <span className="ml-2 text-[11px] font-medium normal-case tracking-normal text-slate-500">
                ({count})
              </span>
            ) : null}
          </span>
        </span>
      </button>

      {open ? (
        <>
          <p className="mt-2 pl-7 text-xs text-slate-500">
            {backendDriven
              ? "Setup-Assistent öffnen zum Zuordnen, Prüfen, Importieren und Aktivieren"
              : "Setup-Assistent öffnen (lokaler Fallback, falls die API offline ist)"}
          </p>
          <ul className="mt-3 space-y-2 pl-0 sm:pl-7">
            {missingSources.map((key) => {
              const busy = activating === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={Boolean(activating)}
                    onClick={() => onConnect?.(key)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1a1f27] px-3 py-2.5 text-left transition hover:border-emerald-500/40 hover:bg-emerald-500/5 disabled:opacity-60"
                  >
                    <span className="text-sm text-slate-200">
                      {sourceLabel(key)}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-400">
                      {busy ? "Wird geöffnet…" : "Einrichten →"}
                    </span>
                  </button>
                </li>
              );
            })}
            {missingSources.length === 0 ? (
              <li className="text-sm text-emerald-400">Keine fehlenden Quellen</li>
            ) : null}
          </ul>
        </>
      ) : null}
    </section>
  );
}
