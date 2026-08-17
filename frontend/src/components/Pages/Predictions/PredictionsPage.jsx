import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import safeApi from "../../../api/safeApi";
import ProvenanceBadge from "../OperationsCenter/components/ProvenanceBadge";
import {
  loadAiSnapshotWithFallback,
  loadBaselineCoverageWithFallback,
} from "../OperationsCenter/buildLiveAiSnapshot";

/**
 * Modules 15 + 16 — Predictions & Actions from live_monitor evaluations.
 * Prefers /operations-center/ai-snapshot; falls back to GET live_* APIs if 404.
 */
export default function PredictionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [dataSource, setDataSource] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ snapshot: snap, source }, coverage] = await Promise.all([
        loadAiSnapshotWithFallback(safeApi, { historyLimit: 25 }),
        loadBaselineCoverageWithFallback(safeApi),
      ]);

      if (!snap?.available && !(snap?.predictions || []).length) {
        setError(
          "Keine Live-Bewertungen — prüfe live_run_evaluations / live_monitor Pipeline"
        );
      } else {
        setError(null);
      }
      setSnapshot(snap);
      setDataSource(source);
      if (coverage) setBaseline(coverage);
    } catch (err) {
      setError(err?.message || "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  const run = snapshot?.latest_run || snapshot?.recommendation;
  const windowRow = snapshot?.latest_window;
  const predictions = snapshot?.predictions || [];
  const actions = snapshot?.actions || [];
  const featureCards = predictions.filter(
    (p) => p.kind === "live_feature_evaluation"
  );
  const anomalyCards = predictions.filter((p) => p.kind === "ml_anomaly");

  return (
    <div className="w-full max-w-full space-y-4 pb-10 text-slate-100">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-white">
            Vorhersagen &amp; Aktionen
          </h1>
          <p className="mt-1 max-w-3xl text-xs text-slate-400">
            Daten nur aus Backend-Postgres. Keine erfundenen Accuracy-%.
            {dataSource ? (
              <span className="ml-1 text-slate-500">
                Quelle:{" "}
                {dataSource === "ai-snapshot" ? "ai-snapshot" : "live_* APIs"}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/" className="oc-map-all-btn">
            Betriebszentrale →
          </Link>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            Aktualisieren
          </button>
        </div>
      </header>

      {error ? <p className="text-xs text-amber-200">{error}</p> : null}
      {loading && !snapshot ? (
        <p className="text-sm text-slate-500">Lade Bewertungen…</p>
      ) : null}

      <section className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-white/10 bg-[#12161e] p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Prozessfenster
            </h2>
            <ProvenanceBadge source="LIVE" />
          </div>
          {!windowRow ? (
            <p className="text-sm text-slate-500">Kein live_process_window</p>
          ) : (
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-slate-500">Confirmed state</dt>
                <dd className="font-medium text-slate-100">
                  {windowRow.confirmed_state || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Window end</dt>
                <dd className="text-slate-200">
                  {windowRow.window_end
                    ? new Date(windowRow.window_end).toLocaleString("de-DE")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Druck Ø</dt>
                <dd>
                  {windowRow.avg_pressure != null
                    ? Number(windowRow.avg_pressure).toFixed(1)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Drehzahl Ø</dt>
                <dd>
                  {windowRow.avg_speed != null
                    ? Number(windowRow.avg_speed).toFixed(1)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Temp Ø</dt>
                <dd>
                  {windowRow.avg_temp != null
                    ? Number(windowRow.avg_temp).toFixed(1)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Last Ø</dt>
                <dd>
                  {windowRow.avg_load != null
                    ? Number(windowRow.avg_load).toFixed(1)
                    : "—"}
                </dd>
              </div>
            </dl>
          )}
        </article>

        <article className="rounded-xl border border-white/10 bg-[#12161e] p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Laufbewertung (Modul 7)
            </h2>
            {run ? (
              <ProvenanceBadge
                source={run.value_source}
                label={run.display_label}
              />
            ) : null}
          </div>
          {!run ? (
            <p className="text-sm text-slate-500">Kein live_run_evaluation</p>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] uppercase">
                <Chip>{run.overall_status || "—"}</Chip>
                <Chip>State {run.detected_state || "—"}</Chip>
                <Chip>Regime {run.active_regime || "—"}</Chip>
                <Chip>{run.stability_status || "—"}</Chip>
                {run.ml_is_anomaly === true ? (
                  <Chip danger>
                    Anomalie
                    {run.ml_anomaly_score != null
                      ? ` ${Number(run.ml_anomaly_score).toFixed(2)}`
                      : ""}
                  </Chip>
                ) : null}
                {run.drift_score != null ? (
                  <Chip>Drift {Number(run.drift_score).toFixed(2)}</Chip>
                ) : null}
              </div>
              <p className="text-sm text-slate-200">
                {run.text || run.explanation_text}
              </p>
            </>
          )}
        </article>
      </section>

      {baseline ? (
        <section className="rounded-xl border border-white/10 bg-[#12161e] p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Baseline-Registry (LOW / MID / HIGH)
            </h2>
            <ProvenanceBadge source="RULE_BASED" />
          </div>
          <p className="text-xs text-slate-400">{baseline.hint}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {["HIGH", "MID", "LOW"].map((r) => (
              <span
                key={r}
                className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1"
              >
                {r}: {baseline.regimes?.[r] ?? 0}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Modul 16 — Empfohlene Aktionen
        </h2>
        {actions.length === 0 ? (
          <p className="text-sm text-slate-500">
            Keine „Recommended action“ in explanation_text.
          </p>
        ) : (
          <ul className="space-y-2">
            {actions.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-4"
              >
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <ProvenanceBadge
                    source={a.value_source}
                    label={a.display_label}
                  />
                </div>
                <p className="text-sm font-medium text-emerald-100">{a.action}</p>
                {a.risk_text ? (
                  <p className="mt-2 text-xs text-slate-400">{a.risk_text}</p>
                ) : null}
                <Link
                  to="/ticket"
                  className="mt-3 inline-block text-xs text-emerald-300 hover:underline"
                >
                  Ticket öffnen →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Modul 15 — ML-Anomalien (ml_is_anomaly)
        </h2>
        {anomalyCards.length === 0 ? (
          <p className="text-sm text-slate-500">Keine aktiven ML-Anomalie-Karten.</p>
        ) : (
          <CardGrid items={anomalyCards} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Modul 15 — Feature-Abweichungen (WARNING / CRITICAL)
        </h2>
        {featureCards.length === 0 ? (
          <p className="text-sm text-slate-500">
            Keine WARNING/CRITICAL live_feature_evaluations.
          </p>
        ) : (
          <CardGrid items={featureCards} />
        )}
      </section>
    </div>
  );
}

function Chip({ children, danger = false }) {
  return (
    <span
      className={`rounded border px-2 py-0.5 ${
        danger
          ? "border-rose-500/40 bg-rose-950/40 text-rose-200"
          : "border-white/15 bg-white/5 text-slate-300"
      }`}
    >
      {children}
    </span>
  );
}

function CardGrid({ items }) {
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {items.map((p) => (
        <li
          key={p.id}
          className="rounded-xl border border-white/10 bg-[#12161e] p-4"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              {p.title || p.feature_name || p.id}
            </p>
            <ProvenanceBadge source={p.value_source} label={p.display_label} />
          </div>
          <p className="text-sm leading-relaxed text-slate-200">{p.text}</p>
          {p.action ? (
            <p className="mt-3 rounded-lg bg-emerald-950/40 px-2 py-1.5 text-xs text-emerald-200">
              Aktion: {p.action}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
