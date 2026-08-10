import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import safeApi from "../../../api/safeApi";

const COMPANY_POLL_MS = 15000;

const FIELD_ORDER = [
  ["material", "Material"],
  ["customer", "Customer order"],
  ["tool", "Tool / mold"],
  ["machine", "Machine"],
  ["product", "Product"],
  ["batch", "Batch"],
  ["status", "Status"],
  ["target", "Target qty"],
  ["actual", "Actual qty"],
  ["progress", "Progress %"],
  ["eta", "ETA"],
  ["elapsed", "Elapsed (min)"],
  ["started", "Started"],
];

const SOURCE_STYLE = {
  LIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  DERIVED: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  MANUAL: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

/**
 * Module 8 — Current Order cockpit (production-ready, non-AI).
 * Uses GET /production-run/order-board
 */
export default function CurrentOrderPage() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get("runId");
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = runId
        ? `/production-run/order-board?run_id=${encodeURIComponent(runId)}`
        : "/production-run/order-board";
      const res = await safeApi.get(q);
      if (res?.fallback || !res?.data) {
        setError(res?.error || "Order board unavailable");
        setBoard(null);
      } else {
        setBoard(res.data);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load");
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    load();
    const id = setInterval(load, COMPANY_POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const fields = board?.fields || {};
  const run = board?.run;

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Module 8
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              Current order
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Material · customer · tool · machine · target/actual · progress · ETA
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              ← Operations Center
            </Link>
            {run?.id ? (
              <Link
                to={`/production-run/detail?runId=${run.id}`}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
              >
                Analyst detail
              </Link>
            ) : null}
            <Link
              to="/historical-runs"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              History
            </Link>
            <button
              type="button"
              onClick={load}
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

      {board?.empty || !run ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#141820] px-4 py-10 text-center">
          <p className="text-sm text-slate-300">
            {board?.message || "No active production run"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Create a run from the sidebar or connect MES/ERP order fields.
          </p>
          <Link
            to="/production-run/detail?create=1"
            className="mt-4 inline-block text-xs text-emerald-300 underline"
          >
            Open create form
          </Link>
        </div>
      ) : (
        <>
          <section className="mb-4 rounded-2xl border border-emerald-500/20 bg-[#141820] p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  Run #{run.id}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-50">
                  {fields.product?.display || "—"} ·{" "}
                  {fields.machine?.display || board.machine_name || "—"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Status:{" "}
                  <span className="text-emerald-300">{fields.status?.display || "—"}</span>
                  {fields.elapsed?.available
                    ? ` · ${fields.elapsed.display} min elapsed`
                    : ""}
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300">
                No invented AI ETA / Accuracy
              </span>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FIELD_ORDER.map(([key, label]) => {
              const cell = fields[key] || {};
              const src = cell.value_source || "MANUAL";
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-white/10 bg-[#141820] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      {label}
                    </p>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] ${
                        SOURCE_STYLE[src] || SOURCE_STYLE.MANUAL
                      }`}
                    >
                      {src}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-slate-50">
                    {key === "progress" && cell.available
                      ? `${cell.display}%`
                      : cell.display ?? "—"}
                  </p>
                  {!cell.available && cell.hint ? (
                    <p className="mt-1 text-[11px] text-slate-500">{cell.hint}</p>
                  ) : null}
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
