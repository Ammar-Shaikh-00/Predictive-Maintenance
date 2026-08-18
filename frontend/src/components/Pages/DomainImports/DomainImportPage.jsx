import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import safeApi from "../../../api/safeApi";

const COMPANY_ID = "default";

/**
 * Shared industrial table page for imported domain sink history.
 */
export default function DomainImportPage({
  title,
  subtitle,
  sourceKey,
  endpoint,
  columns,
  setupHint,
}) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, sumRes] = await Promise.all([
        safeApi.get(
          `${endpoint}?company_id=${COMPANY_ID}&limit=200`
        ),
        safeApi.get(
          `/operations-hardening/domain-imports/summary?company_id=${COMPANY_ID}`
        ),
      ]);
      if (listRes?.fallback) {
        setError(listRes.error || "Failed to load domain import rows");
        setRows([]);
      } else {
        setRows(listRes?.data?.rows || []);
      }
      if (!sumRes?.fallback) {
        setSummary(sumRes?.data || null);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Domain data
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Source key: <code className="text-emerald-300/90">{sourceKey}</code> ·
              provenance LIVE from connector import
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              ← Operations Center
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
        {error ? (
          <p className="mt-3 text-xs text-amber-200">{error}</p>
        ) : null}
      </header>

      {summary ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ["Quality", summary.quality_events],
            ["Maintenance", summary.maintenance_events],
            ["Material", summary.material_batches],
            ["Energy", summary.energy_readings],
            ["Operator", summary.operator_events],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-[#141820] px-3 py-2"
            >
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                {label}
              </p>
              <p className="text-lg font-semibold text-emerald-300">{value ?? 0}</p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-[#141820] p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Imported rows ({rows.length})
          </h2>
          {rows.length === 0 && !loading ? (
            <Link
              to="/"
              className="text-xs text-emerald-300 hover:underline"
            >
              {setupHint || "Connect this source via Setup Wizard on Operations Center →"}
            </Link>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#1a1f27] px-4 py-8 text-center">
            <p className="text-sm text-slate-300">No imported rows yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Use Operations Center → Missing sources → Setup Wizard to import{" "}
              <strong className="text-slate-300">{sourceKey}</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="px-3 py-2 font-medium whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-2 text-slate-200 whitespace-nowrap">
                        {col.render
                          ? col.render(row)
                          : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
