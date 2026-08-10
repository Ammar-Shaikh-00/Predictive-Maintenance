/**
 * Build machine × feature deviation heatmap from live windows + evaluations.
 * Rule-based vs baseline — no invented model scores.
 */

const STATUS_RANK = {
  CRITICAL: 3,
  UNSTABLE: 3,
  WARNING: 2,
  NORMAL: 1,
  STABLE: 1,
  HEALTHY: 1,
};

export function statusRank(status) {
  if (!status) return 0;
  return STATUS_RANK[String(status).toUpperCase()] || 0;
}

/** Heat intensity 0–1 from status + |deviation_pct|. */
export function heatIntensity(evaluation) {
  if (!evaluation) return 0;
  const rank = statusRank(evaluation.feature_status);
  const pct = Math.abs(Number(evaluation.deviation_pct));
  const pctPart = Number.isFinite(pct) ? Math.min(1, pct / 12) : 0;
  if (rank >= 3) return Math.max(0.55, 0.55 + pctPart * 0.45);
  if (rank === 2) return Math.max(0.35, 0.3 + pctPart * 0.4);
  if (rank === 1) return Math.max(0.08, 0.08 + pctPart * 0.2);
  return pctPart * 0.25;
}

/** Tailwind-ish class for a cell (industrial dark skin). */
export function heatCellClass(evaluation) {
  if (!evaluation) {
    return "bg-white/[0.03] text-slate-600 border-white/5";
  }
  const rank = statusRank(evaluation.feature_status);
  if (rank >= 3) return "bg-rose-500/50 text-rose-50 border-rose-400/40";
  if (rank === 2) return "bg-amber-500/35 text-amber-50 border-amber-400/30";
  if (rank === 1) return "bg-emerald-500/25 text-emerald-50 border-emerald-400/25";
  return "bg-slate-500/20 text-slate-300 border-white/10";
}

/**
 * Latest live process window per machine_id (null → "__none__").
 * Windows must be newest-first.
 */
export function latestWindowByMachine(windows = []) {
  const map = new Map();
  for (const w of windows) {
    const key = w?.machine_id != null ? String(w.machine_id) : "__none__";
    if (!map.has(key)) map.set(key, w);
  }
  return map;
}

/**
 * @returns {{
 *   features: string[],
 *   rows: Array<{
 *     machineId: string|null,
 *     machineName: string,
 *     window: object|null,
 *     cells: Record<string, object|null>,
 *     maxRank: number,
 *     maxAbsPct: number|null,
 *     hasData: boolean,
 *   }>,
 *   counts: { critical: number, warning: number, normal: number, idle: number }
 * }}
 */
export function buildDeviationHeatmap({
  machines = [],
  windows = [],
  evaluations = [],
} = {}) {
  const windowByMachine = latestWindowByMachine(windows);
  const windowIds = new Set(
    [...windowByMachine.values()].map((w) => w?.id).filter((id) => id != null)
  );

  const evalsByWindow = new Map();
  for (const ev of evaluations) {
    const wid = ev?.live_process_window_id;
    if (wid == null || !windowIds.has(wid)) continue;
    if (!evalsByWindow.has(wid)) evalsByWindow.set(wid, []);
    evalsByWindow.get(wid).push(ev);
  }

  const featureSet = new Set();
  for (const list of evalsByWindow.values()) {
    for (const ev of list) {
      if (ev?.feature_name) featureSet.add(ev.feature_name);
    }
  }
  const features = [...featureSet].sort();

  const machineById = new Map();
  for (const m of machines) {
    if (m?.id != null) machineById.set(String(m.id), m);
  }

  const machineKeys = new Set([
    ...[...machineById.keys()],
    ...[...windowByMachine.keys()].filter((k) => k !== "__none__"),
  ]);

  const rows = [];

  for (const mid of [...machineKeys].sort((a, b) => {
    const na = machineById.get(a)?.name || a;
    const nb = machineById.get(b)?.name || b;
    return String(na).localeCompare(String(nb));
  })) {
    const machine = machineById.get(mid);
    const window = windowByMachine.get(mid) || null;
    const list = window ? evalsByWindow.get(window.id) || [] : [];
    const byFeature = {};
    for (const f of features) byFeature[f] = null;
    for (const ev of list) {
      if (!ev?.feature_name) continue;
      // keep first (evaluations usually newest-first)
      if (!byFeature[ev.feature_name]) byFeature[ev.feature_name] = ev;
    }

    let maxRank = 0;
    let maxAbsPct = null;
    for (const ev of Object.values(byFeature)) {
      if (!ev) continue;
      maxRank = Math.max(maxRank, statusRank(ev.feature_status));
      const pct = Math.abs(Number(ev.deviation_pct));
      if (Number.isFinite(pct)) {
        maxAbsPct = maxAbsPct == null ? pct : Math.max(maxAbsPct, pct);
      }
    }

    rows.push({
      machineId: mid,
      machineName: machine?.name || `Machine ${mid.slice(0, 8)}`,
      window,
      cells: byFeature,
      maxRank,
      maxAbsPct,
      hasData: list.length > 0,
    });
  }

  // Orphan windows without machine_id
  if (windowByMachine.has("__none__")) {
    const window = windowByMachine.get("__none__");
    const list = evalsByWindow.get(window.id) || [];
    const byFeature = {};
    for (const f of features) byFeature[f] = null;
    for (const ev of list) {
      if (!ev?.feature_name) continue;
      if (!byFeature[ev.feature_name]) byFeature[ev.feature_name] = ev;
    }
    let maxRank = 0;
    let maxAbsPct = null;
    for (const ev of Object.values(byFeature)) {
      if (!ev) continue;
      maxRank = Math.max(maxRank, statusRank(ev.feature_status));
      const pct = Math.abs(Number(ev.deviation_pct));
      if (Number.isFinite(pct)) {
        maxAbsPct = maxAbsPct == null ? pct : Math.max(maxAbsPct, pct);
      }
    }
    rows.push({
      machineId: null,
      machineName: "Unassigned window",
      window,
      cells: byFeature,
      maxRank,
      maxAbsPct,
      hasData: list.length > 0,
    });
  }

  const counts = { critical: 0, warning: 0, normal: 0, idle: 0 };
  for (const row of rows) {
    if (!row.hasData) counts.idle += 1;
    else if (row.maxRank >= 3) counts.critical += 1;
    else if (row.maxRank === 2) counts.warning += 1;
    else counts.normal += 1;
  }

  // Sort hottest machines first
  rows.sort((a, b) => {
    if (b.maxRank !== a.maxRank) return b.maxRank - a.maxRank;
    return (b.maxAbsPct || 0) - (a.maxAbsPct || 0);
  });

  return { features, rows, counts };
}
