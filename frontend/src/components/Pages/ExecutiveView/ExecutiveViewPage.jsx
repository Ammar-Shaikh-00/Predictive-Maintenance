import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import safeApi from "../../../api/safeApi";
import ProvenanceBadge from "../OperationsCenter/components/ProvenanceBadge";

const COMPANY_ID = "default";
const POLL_MS = 30000;

function fmt(v, digits = 1) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function money(v, currency = "EUR") {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const symbol = currency === "EUR" ? "€" : `${currency} `;
  return `${symbol}${fmt(v, 2)}`;
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PRODUCTION") return "text-emerald-300";
  if (s === "FAULT") return "text-rose-300";
  if (s === "HEATING" || s === "COOLING" || s === "READY") return "text-amber-300";
  return "text-slate-400";
}

/**
 * Module 20 — Executive View (production-ready).
 * High-level management KPIs. Never invents ROI / Accuracy / utilization %.
 */
export default function ExecutiveViewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    setError(null);
    try {
      const res = await safeApi.get(
        `/executive-view/overview?company_id=${COMPANY_ID}`
      );
      if (res?.fallback) {
        setError(res.error || "Could not load Executive View");
        if (!soft) setData(null);
      } else {
        setData(res?.data || null);
      }
    } catch (err) {
      setError(err?.message || "Failed to load");
      if (!soft) setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ soft: false });
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load({ soft: true }), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const progress = data?.progress || {};
  const aiBenefit = data?.ai_benefit || {};
  const aiRoi = data?.ai_roi || {};
  const currency = data?.energy_cost?.currency || "EUR";

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Module 20
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              Executive View
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              High-level KPIs for management — produced, scrap, energy, problems,
              readiness. No invented ROI or Accuracy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              ← Operations Center
            </Link>
            <Link
              to="/energy"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Energy
            </Link>
            <button
              type="button"
              onClick={() => load({ soft: true })}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}
      </header>

      {loading && !data ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
      ) : null}

      {data ? (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-white/10 bg-[#141820] px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Plant status · {data.as_of_day}
              </p>
              <p
                className={`mt-1 text-2xl font-semibold tracking-tight ${statusTone(
                  data.plant_status
                )}`}
              >
                {data.plant_status || "—"}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-400">
              <span>
                Machines{" "}
                <strong className="text-slate-200">
                  {progress.connected_machines ?? 0}/{progress.total_machines ?? 0}
                </strong>
              </span>
              <span>
                Alarms{" "}
                <strong className="text-amber-300">{progress.open_alarms ?? 0}</strong>
              </span>
              <span>
                Tickets{" "}
                <strong className="text-sky-300">{progress.open_tickets ?? 0}</strong>
              </span>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {(data.kpis || []).map((k) => (
              <div
                key={k.key}
                className="rounded-xl border border-white/10 bg-[#141820] px-3 py-3"
              >
                <div className="mb-1 flex items-center justify-between gap-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {k.label}
                  </p>
                  {k.available ? (
                    <ProvenanceBadge source={k.value_source} />
                  ) : null}
                </div>
                <p className="text-xl font-semibold text-emerald-300">
                  {k.available ? (
                    <>
                      {fmt(k.value, k.unit === "%" ? 0 : 1)}
                      {k.unit ? (
                        <span className="ml-1 text-sm font-normal text-slate-500">
                          {k.unit}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                {!k.available && k.hint ? (
                  <p className="mt-1 text-[10px] leading-snug text-slate-600">
                    {k.hint}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            {[
              ["Digitalization", progress.digitalization_progress, "DERIVED"],
              ["Prediction readiness", progress.prediction_readiness, "DERIVED"],
              ["Data quality", progress.data_quality_score, "DERIVED"],
            ].map(([label, value, source]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-[#141820] px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {label}
                  </p>
                  <ProvenanceBadge source={source} />
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-100">
                  {value != null ? `${fmt(value, 0)}%` : "—"}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
                Top problems
              </h2>
              {(data.top_problems || []).length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No open alarms or critical tickets
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.top_problems.map((p) => (
                    <li
                      key={`${p.kind}-${p.id}`}
                      className="rounded-xl border border-white/5 px-3 py-2"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <ProvenanceBadge source={p.value_source || "LIVE"} />
                        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
                          {p.kind}
                          {p.severity ? ` · ${p.severity}` : ""}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200">{p.text}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2 text-xs">
                <Link to="/ticket" className="text-emerald-300 hover:underline">
                  Tickets →
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
                Top savings
              </h2>
              {(data.top_savings || []).length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Set an energy baseline under Energy Center settings to show
                  savings potential.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.top_savings.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-xl border border-white/5 px-3 py-3"
                    >
                      <div className="mb-1">
                        <ProvenanceBadge source={s.value_source || "DERIVED"} />
                      </div>
                      <p className="text-sm text-slate-200">{s.title}</p>
                      <p className="mt-1 text-xl font-semibold text-emerald-300">
                        {fmt(s.value, 1)} {s.unit}
                      </p>
                      <p className="text-xs text-slate-500">
                        Cost: {money(s.cost, s.currency || currency)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/energy?tab=settings"
                className="mt-3 inline-block text-xs text-emerald-300 hover:underline"
              >
                Energy settings →
              </Link>
            </section>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  AI benefit
                </h2>
                {aiBenefit.available ? (
                  <ProvenanceBadge source={aiBenefit.value_source || "DERIVED"} />
                ) : null}
              </div>
              <p className="text-xs text-slate-500">{aiBenefit.label}</p>
              <p className="mt-1 text-3xl font-semibold text-emerald-300">
                {aiBenefit.available ? `${fmt(aiBenefit.value, 0)}%` : "—"}
              </p>
              <p className="mt-2 text-[11px] text-slate-600">{aiBenefit.hint}</p>
            </section>

            <section className="rounded-2xl border border-dashed border-white/10 bg-[#141820] p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
                {aiRoi.label}
              </h2>
              <p className="text-3xl font-semibold text-slate-500">—</p>
              <p className="mt-2 text-[11px] text-slate-600">{aiRoi.hint}</p>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
