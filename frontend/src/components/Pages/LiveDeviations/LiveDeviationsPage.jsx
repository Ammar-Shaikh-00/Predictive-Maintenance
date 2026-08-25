import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import safeApi from "../../../api/safeApi";
import ProvenanceBadge from "../OperationsCenter/components/ProvenanceBadge";
import {
  buildDeviationHeatmap,
  heatCellClass,
  statusRank,
} from "./buildDeviationHeatmap";

const POLL_MS = 15000;

function formatFeature(name, t) {
  return t(`liveEstimated.featureNames.${name}`, {
    defaultValue: String(name || "—").replace(/_/g, " "),
  });
}

function formatPct(v) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  const n = Number(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function formatNum(v, digits = 2) {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Number(v).toFixed(digits);
}

/**
 * Module 14 — Live Deviations (production-ready).
 * Heatmap: machine × feature deviation from baseline (RULE_BASED).
 * Reuses /live-process-windows + /live-feature-evaluations. No invented AI.
 */
export default function LiveDeviationsPage() {
  const { t } = useTranslation();
  const [machines, setMachines] = useState([]);
  const [windows, setWindows] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const load = useCallback(async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    setError(null);
    try {
      const [machRes, winRes, evalRes] = await Promise.all([
        safeApi.get("/machines"),
        safeApi.get("/live-process-windows?limit=200"),
        safeApi.get("/live-feature-evaluations?limit=800"),
      ]);

      if (machRes?.fallback) {
        setError(machRes.error || t("liveDeviations.loadFailed"));
        setMachines([]);
      } else {
        setMachines(Array.isArray(machRes?.data) ? machRes.data : []);
      }

      if (winRes?.fallback) {
        setWindows([]);
        if (!machRes?.fallback) {
          setError(winRes.error || t("liveDeviations.loadFailed"));
        }
      } else {
        setWindows(Array.isArray(winRes?.data) ? winRes.data : []);
      }

      if (evalRes?.fallback) {
        setEvaluations([]);
      } else {
        setEvaluations(Array.isArray(evalRes?.data) ? evalRes.data : []);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err?.message || t("liveDeviations.loadFailed"));
      if (!soft) {
        setMachines([]);
        setWindows([]);
        setEvaluations([]);
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load({ soft: false });
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => load({ soft: true }), POLL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const heatmap = useMemo(
    () =>
      buildDeviationHeatmap({
        machines,
        windows,
        evaluations,
      }),
    [machines, windows, evaluations]
  );

  const selectedRow = useMemo(() => {
    if (selectedMachineId == null) {
      return heatmap.rows.find((r) => r.hasData) || heatmap.rows[0] || null;
    }
    return (
      heatmap.rows.find(
        (r) =>
          String(r.machineId) === String(selectedMachineId) ||
          (selectedMachineId === "__none__" && r.machineId == null)
      ) || null
    );
  }, [heatmap.rows, selectedMachineId]);

  const detailRows = useMemo(() => {
    if (!selectedRow?.cells) return [];
    return Object.entries(selectedRow.cells)
      .map(([feature, ev]) => ({ feature, ev }))
      .sort((a, b) => statusRank(b.ev?.feature_status) - statusRank(a.ev?.feature_status));
  }, [selectedRow]);

  return (
    <div className="oc-skin min-h-[calc(100vh-5rem)] px-3 sm:px-4 pb-8 text-slate-100">
      <header className="mb-5 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90">
              ZITTA · Module 14
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              {t("liveDeviations.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {t("liveDeviations.description")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/baseline"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              ← {t("liveDeviations.baselines")}
            </Link>
            <Link
              to="/live-estimations"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              {t("liveDeviations.liveEstimations")}
            </Link>
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`rounded-xl border px-3 py-2 text-xs ${
                autoRefresh
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 text-slate-400 hover:bg-white/5"
              }`}
            >
              {autoRefresh
                ? t("liveEstimated.autoRefreshOn")
                : t("liveEstimated.autoRefreshOff")}
            </button>
            <button
              type="button"
              onClick={() => load({ soft: true })}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("common.refresh", { defaultValue: "Aktualisieren" })}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <ProvenanceBadge source="RULE_BASED" />
          <span>
            {t("liveEstimated.lastRefreshedAt")}{" "}
            {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
          </span>
        </div>
        {error ? <p className="mt-3 text-xs text-amber-200">{error}</p> : null}
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          [t("liveDeviations.kpi.critical"), heatmap.counts.critical, "text-rose-300"],
          [t("liveDeviations.kpi.warning"), heatmap.counts.warning, "text-amber-300"],
          [t("liveDeviations.kpi.normal"), heatmap.counts.normal, "text-emerald-300"],
          [t("liveDeviations.kpi.noData"), heatmap.counts.idle, "text-slate-400"],
        ].map(([label, value, tone]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-[#141820] px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      {loading && heatmap.rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          {t("liveDeviations.loading")}
        </p>
      ) : heatmap.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#141820] px-4 py-10 text-center">
          <p className="text-sm text-slate-300">{t("liveDeviations.empty")}</p>
          <Link
            to="/baseline"
            className="mt-3 inline-block text-xs text-emerald-300 hover:underline"
          >
            {t("liveDeviations.setupBaseline")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                {t("liveDeviations.heatmapTitle")}
              </h2>
              <p className="text-[11px] text-slate-500">
                {t("liveDeviations.heatmapHint")}
              </p>
            </div>

            {heatmap.features.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                {t("liveDeviations.noEvaluations")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-separate border-spacing-1">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-[#141820] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {t("liveDeviations.machine")}
                      </th>
                      {heatmap.features.map((f) => (
                        <th
                          key={f}
                          className="px-1 py-2 text-center text-[10px] font-medium text-slate-500"
                          title={f}
                        >
                          <span className="inline-block max-w-[4.5rem] truncate">
                            {formatFeature(f, t)}
                          </span>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Max
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatmap.rows.map((row) => {
                      const rowKey = row.machineId ?? "__none__";
                      const isSelected =
                        selectedRow &&
                        String(selectedRow.machineId) === String(row.machineId);
                      return (
                        <tr key={rowKey}>
                          <td
                            className={`sticky left-0 z-10 cursor-pointer rounded-lg bg-[#141820] px-2 py-1.5 text-xs font-medium ${
                              isSelected
                                ? "text-emerald-200 ring-1 ring-emerald-500/40"
                                : "text-slate-200 hover:bg-white/5"
                            }`}
                            onClick={() => setSelectedMachineId(rowKey)}
                          >
                            {row.machineName}
                            {!row.hasData ? (
                              <span className="ml-1 text-[10px] text-slate-600">
                                —
                              </span>
                            ) : null}
                          </td>
                          {heatmap.features.map((f) => {
                            const ev = row.cells[f];
                            const active =
                              isSelected && selectedFeature === f;
                            return (
                              <td key={f} className="p-0">
                                <button
                                  type="button"
                                  title={
                                    ev
                                      ? `${formatFeature(f, t)}: ${formatPct(
                                          ev.deviation_pct
                                        )} · ${ev.feature_status || "—"}`
                                      : t("liveDeviations.noDataCell")
                                  }
                                  onClick={() => {
                                    setSelectedMachineId(rowKey);
                                    setSelectedFeature(f);
                                  }}
                                  className={`flex h-10 w-full min-w-[3.25rem] items-center justify-center rounded-lg border text-[11px] font-semibold tabular-nums transition ${heatCellClass(
                                    ev
                                  )} ${
                                    active ? "ring-2 ring-white/40" : ""
                                  }`}
                                >
                                  {ev ? formatPct(ev.deviation_pct) : "·"}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-2 py-1 text-right text-xs tabular-nums text-slate-400">
                            {row.maxAbsPct != null
                              ? `${row.maxAbsPct.toFixed(1)}%`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40" />
                {t("liveDeviations.legend.ok")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/50" />
                {t("liveDeviations.legend.warn")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500/60" />
                {t("liveDeviations.legend.critical")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-white/10" />
                {t("liveDeviations.legend.none")}
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#141820] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              {selectedRow
                ? selectedRow.machineName
                : t("liveDeviations.detailTitle")}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {selectedRow?.window
                ? `${t("liveDeviations.window")} #${selectedRow.window.id} · ${
                    selectedRow.window.confirmed_state || "—"
                  }`
                : t("liveDeviations.noWindow")}
            </p>

            {!selectedRow?.hasData ? (
              <p className="mt-6 text-sm text-slate-500">
                {t("liveDeviations.noEvaluations")}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="py-2 text-left font-semibold">
                        {t("liveEstimated.stability.parameter")}
                      </th>
                      <th className="py-2 text-right font-semibold">
                        {t("liveDeviations.current")}
                      </th>
                      <th className="py-2 text-right font-semibold">
                        {t("liveDeviations.baseline")}
                      </th>
                      <th className="py-2 text-right font-semibold">
                        {t("liveEstimated.stability.deviation")}
                      </th>
                      <th className="py-2 text-right font-semibold">
                        {t("liveEstimated.stability.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map(({ feature, ev }) => {
                      const active = selectedFeature === feature;
                      return (
                        <tr
                          key={feature}
                          className={`border-b border-white/5 ${
                            active ? "bg-white/[0.04]" : ""
                          }`}
                        >
                          <td className="py-2.5 text-slate-200">
                            {formatFeature(feature, t)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-slate-300">
                            {formatNum(ev?.current_value)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-slate-400">
                            {formatNum(ev?.baseline_mean)}
                          </td>
                          <td
                            className={`py-2.5 text-right font-semibold tabular-nums ${
                              statusRank(ev?.feature_status) >= 3
                                ? "text-rose-300"
                                : statusRank(ev?.feature_status) === 2
                                  ? "text-amber-300"
                                  : "text-emerald-300"
                            }`}
                          >
                            {formatPct(ev?.deviation_pct)}
                          </td>
                          <td className="py-2.5 text-right text-xs text-slate-400">
                            {ev?.feature_status
                              ? t(`liveEstimated.status.${ev.feature_status}`, {
                                  defaultValue: ev.feature_status,
                                })
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
