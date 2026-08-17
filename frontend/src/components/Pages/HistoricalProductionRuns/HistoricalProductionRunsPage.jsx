import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import safeApi from "../../../api/safeApi";

const DAY_OPTIONS = [7, 30, 90];

function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) return "—";
  const s = Number(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (hrs <= 0) return `${mins} Min.`;
  return `${hrs} Std. ${mins} Min.`;
}

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "RUNNING" || s === "PRODUCTION" || s === "NORMAL") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }
  if (s === "WARNING" || s === "HEATING" || s === "COOLING") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  }
  if (s === "CRITICAL" || s === "FAULT" || s === "ERROR") {
    return "border-rose-500/40 bg-rose-500/10 text-rose-200";
  }
  return "border-white/15 bg-white/5 text-slate-300";
}

/**
 * Module 9 — Production History chronological timeline (production-ready).
 * Uses GET /historical-run and /historical-run/status. No invented AI ratings.
 */
export default function HistoricalProductionRunsPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, statusRes] = await Promise.all([
        safeApi.get(`/historical-run/?days=${days}`),
        safeApi.get(`/historical-run/status?days=${days}`),
      ]);

      if (listRes?.fallback) {
        setError(listRes.error || "Produktionshistorie konnte nicht geladen werden");
        setRuns([]);
      } else {
        const rows = Array.isArray(listRes?.data) ? listRes.data : [];
        // Already chronological from API (start_time desc); keep that order for timeline
        setRuns(rows);
      }

      if (!statusRes?.fallback) {
        setStats(statusRes?.data || null);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Laden fehlgeschlagen");
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const timeline = useMemo(
    () =>
      (runs || []).map((run) => ({
        id: run.run_id,
        when: run.start_time,
        title: run.product || `Lauf #${run.run_id}`,
        subtitle: [
          run.machine_name || null,
          run.line_id != null ? `Linie ${run.line_id}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        status: run.status || "UNKNOWN",
        duration: run.duration,
        scrap: run.scrap_percentage,
        value_source: "LIVE",
      })),
    [runs]
  );

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Modul 9
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              Produktionshistorie
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Chronologische Zeitleiste der Produktionsläufe — nur Fakten
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/production-run"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              ← Aktueller Auftrag
            </Link>
            <Link
              to="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Betriebszentrale
            </Link>
            <div className="flex rounded-xl border border-white/10 overflow-hidden">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-3 py-2 text-xs ${
                    days === d
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "text-slate-400 hover:bg-white/5"
                  }`}
                >
                  {d}T
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Aktualisieren
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}
      </header>

      {stats ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {[
            ["Läufe gesamt", stats.total_runs],
            [
              "Durchschn. Ausschuss %",
              stats.Average_scrap != null
                ? `${Number(stats.Average_scrap).toFixed(2)}%`
                : "—",
            ],
            ["Durchschn. Dauer", formatDuration(stats.Average_duration)],
            ["Normal", stats.normal_runs],
            ["Warnung", stats.warning_runs],
            ["Kritisch", stats.critical_runs],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-[#141820] px-3 py-2"
            >
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                {label}
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-300">{value ?? 0}</p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-[#141820] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Ereigniszeitleiste ({timeline.length})
          </h2>
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
            LIVE · keine KI-Bewertung
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Zeitleiste wird geladen…</p>
        ) : timeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#1a1f27] px-4 py-10 text-center">
            <p className="text-sm text-slate-300">Keine Produktionsläufe</p>
            <p className="mt-1 text-xs text-slate-500">
              Erstellen Sie einen Lauf über Aktueller Auftrag, oder erweitern Sie den Tagesbereich.
            </p>
            <Link
              to="/production-run"
              className="mt-3 inline-block text-xs text-emerald-300 underline"
            >
              Aktuellen Auftrag öffnen
            </Link>
          </div>
        ) : (
          <ol className="relative space-y-0 border-l border-white/10 ml-3 sm:ml-4">
            {timeline.map((ev) => (
              <li key={ev.id} className="relative pl-6 sm:pl-8 pb-6 last:pb-0">
                <span className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full border border-emerald-400/60 bg-emerald-500/40" />
                <button
                  type="button"
                  onClick={() => navigate(`/production-run?runId=${ev.id}`)}
                  className="w-full rounded-xl border border-white/10 bg-[#1a1f27] px-4 py-3 text-left transition hover:border-emerald-500/30 hover:bg-[#1c222c]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-500">{formatWhen(ev.when)}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-50 truncate">
                        #{ev.id} · {ev.title}
                      </p>
                      {ev.subtitle ? (
                        <p className="mt-0.5 text-xs text-slate-400">{ev.subtitle}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusTone(
                          ev.status
                        )}`}
                      >
                        {ev.status}
                      </span>
                      <span className="rounded border border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0.5 text-[10px] text-emerald-300">
                        {ev.value_source}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                    <span>
                      Dauer:{" "}
                      <strong className="text-slate-200">
                        {formatDuration(ev.duration)}
                      </strong>
                    </span>
                    <span>
                      Ausschuss:{" "}
                      <strong className="text-slate-200">
                        {ev.scrap != null ? `${Number(ev.scrap).toFixed(2)}%` : "—"}
                      </strong>
                    </span>
                    <span className="text-emerald-300/80">Aktuellen Auftrag öffnen →</span>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
