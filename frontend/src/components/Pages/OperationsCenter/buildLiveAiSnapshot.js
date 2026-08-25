/**
 * Client-side Live AI snapshot from Ammar's Postgres-backed APIs.
 * Used when /operations-center/ai-snapshot is not deployed yet (404),
 * or to enrich OC without inventing scores.
 *
 * Reads only:
 *   GET /live-run-evaluations
 *   GET /live-feature-evaluations
 *   GET /live-process-windows
 *   GET /baseline-registry (list → coverage)
 */

const ACTION_RE =
  /(?:Recommended action|Empfohlene Maßnahme)\s*:\s*(.+?)(?=\s*\[(?:MODEL_PREDICTION|RULE_BASED)\]|\s*$)/i;
const TAG_RE = /\[(MODEL_PREDICTION|RULE_BASED|DERIVED|LIVE|SIMULATED)\]/gi;

function extractTags(text) {
  if (!text) return [];
  const found = [];
  String(text).replace(TAG_RE, (_, t) => {
    const u = String(t).toUpperCase();
    if (!found.includes(u)) found.push(u);
    return _;
  });
  return found;
}

function extractAction(text) {
  if (!text) return null;
  const m = String(text).match(ACTION_RE);
  if (!m) return null;
  return m[1].replace(TAG_RE, "").trim().replace(/[.;\s]+$/, "") || null;
}

function cleanText(text) {
  if (!text) return null;
  return String(text)
    .replace(ACTION_RE, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.\s]+$/, "");
}

function provenanceForRun(run) {
  const tags = extractTags(run?.explanation_text);
  if (tags.includes("MODEL_PREDICTION")) {
    return { value_source: "MODEL_PREDICTION", display_label: "Modellvorhersage" };
  }
  if (run?.ml_is_anomaly === true) {
    return { value_source: "MODEL_PREDICTION", display_label: "Modellvorhersage" };
  }
  if (tags.includes("RULE_BASED")) {
    return { value_source: "RULE_BASED", display_label: "Regelbasierte Auswertung" };
  }
  return { value_source: "RULE_BASED", display_label: "Regelbasierte Auswertung" };
}

function mapRun(run, drivers = []) {
  if (!run) return null;
  const prov = provenanceForRun(run);
  const explanation = run.explanation_text || null;
  return {
    id: `lre-${run.id}`,
    live_run_evaluation_id: run.id,
    live_process_window_id: run.live_process_window_id,
    machine_id: run.machine_id != null ? String(run.machine_id) : null,
    production_run_id: run.production_run_id,
    detected_state: run.detected_state,
    overall_status: run.overall_status,
    stability_status: run.stability_status,
    drift_score: run.drift_score,
    active_regime: run.active_regime,
    ml_is_anomaly: run.ml_is_anomaly,
    ml_anomaly_score: run.ml_anomaly_score,
    ml_model_status: run.ml_model_status,
    explanation_text: explanation,
    text: cleanText(explanation) || `Status ${run.overall_status || "—"}`,
    action: extractAction(explanation),
    provenance_tags: extractTags(explanation),
    feature_drivers: drivers,
    severity: String(run.overall_status || "WARNING").toLowerCase(),
    ...prov,
  };
}

function mapFeatureCard(f) {
  const status = String(f.feature_status || "").toUpperCase();
  const z =
    f.z_score != null && Number.isFinite(Number(f.z_score))
      ? ` (z=${Number(f.z_score).toFixed(2)})`
      : "";
  let text = `${f.feature_name}: ${status}${z}`;
  if (f.current_value != null) {
    text += ` — Istwert ${Number(f.current_value).toFixed(3)}`;
  }
  return {
    id: `lfe-${f.id}`,
    kind: "live_feature_evaluation",
    title: f.feature_name || `Feature #${f.id}`,
    text,
    feature_name: f.feature_name,
    feature_status: f.feature_status,
    z_score: f.z_score,
    current_value: f.current_value,
    severity: status.toLowerCase(),
    overall_status: status,
    value_source: "RULE_BASED",
    display_label: "Regelbasierte Auswertung",
    action: null,
  };
}

function mapAnomalyCard(run) {
  const mapped = mapRun(run);
  return {
    ...mapped,
    id: `lre-anomaly-${run.id}`,
    kind: "ml_anomaly",
    title: `Anomalie · Laufbewertung #${run.id}`,
  };
}

function mapWindow(w) {
  if (!w) return null;
  return {
    id: w.id,
    window_start: w.window_start,
    window_end: w.window_end,
    confirmed_state: w.confirmed_state,
    candidate_state: w.candidate_state,
    machine_id: w.machine_id != null ? String(w.machine_id) : null,
    production_run_id: w.production_run_id,
    avg_pressure: w.avg_pressure,
    avg_speed: w.avg_speed,
    avg_temp: w.avg_temp,
    avg_load: w.avg_load,
    row_count: w.row_count,
    value_source: "LIVE",
    display_label: "LIVE",
  };
}

function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

/**
 * @param {object} safeApi - project safeApi client
 * @param {{ historyLimit?: number, machineId?: string|null }} opts
 */
export async function fetchLiveAiSnapshot(safeApi, opts = {}) {
  const historyLimit = opts.historyLimit || 25;
  const machineId = opts.machineId || null;

  const runQs = new URLSearchParams({
    limit: String(historyLimit),
    offset: "0",
  });
  if (machineId) runQs.set("machine_id", String(machineId));

  const winQs = new URLSearchParams({ limit: "1", offset: "0" });
  if (machineId) winQs.set("machine_id", String(machineId));

  const [runsRes, winsRes] = await Promise.all([
    safeApi.get(`/live-run-evaluations?${runQs}`),
    safeApi.get(`/live-process-windows?${winQs}`),
  ]);

  const runs = asList(runsRes?.data);
  const windows = asList(winsRes?.data);
  const latest = runs[0] || null;
  const window =
    windows.find(
      (w) =>
        latest &&
        latest.live_process_window_id != null &&
        Number(w.id) === Number(latest.live_process_window_id)
    ) ||
    windows[0] ||
    null;

  let features = [];
  if (latest?.id != null || latest?.live_process_window_id != null) {
    const featQs = new URLSearchParams({ limit: "40", offset: "0" });
    if (latest.live_run_evaluation_id != null || latest.id != null) {
      // prefer by run id
      featQs.set("live_run_evaluation_id", String(latest.id));
    } else if (latest.live_process_window_id != null) {
      featQs.set("live_process_window_id", String(latest.live_process_window_id));
    }
    const featRes = await safeApi.get(`/live-feature-evaluations?${featQs}`);
    features = asList(featRes?.data);
    if (
      !features.length &&
      latest.live_process_window_id != null &&
      featQs.has("live_run_evaluation_id")
    ) {
      const alt = new URLSearchParams({
        limit: "40",
        live_process_window_id: String(latest.live_process_window_id),
      });
      const altRes = await safeApi.get(`/live-feature-evaluations?${alt}`);
      features = asList(altRes?.data);
    }
  }

  const drivers = features.map((f) => ({
    id: f.id,
    feature_name: f.feature_name,
    feature_status: f.feature_status,
    z_score: f.z_score,
    current_value: f.current_value,
    value_source: "RULE_BASED",
    display_label: "Regelbasierte Auswertung",
  }));

  const recommendation = mapRun(latest, drivers);
  const predictions = [];
  const actions = [];
  const risks = recommendation ? [recommendation] : [];

  if (latest?.ml_is_anomaly === true) {
    predictions.push(mapAnomalyCard(latest));
  }
  for (const f of features) {
    const st = String(f.feature_status || "").toUpperCase();
    if (st === "WARNING" || st === "CRITICAL") {
      predictions.push(mapFeatureCard(f));
    }
  }

  if (recommendation?.action) {
    actions.push({
      id: `action-${recommendation.id}`,
      risk_id: recommendation.id,
      risk_text: recommendation.text,
      action: recommendation.action,
      severity: recommendation.overall_status,
      value_source: recommendation.value_source,
      display_label: recommendation.display_label,
      machine_id: recommendation.machine_id,
      detected_state: recommendation.detected_state,
      provenance_tags: recommendation.provenance_tags || [],
    });
  }

  for (const run of runs.slice(1)) {
    if (run.ml_is_anomaly === true) {
      predictions.push(mapAnomalyCard(run));
    }
    const act = extractAction(run.explanation_text);
    const status = String(run.overall_status || "").toUpperCase();
    if (act && (status === "WARNING" || status === "CRITICAL")) {
      const mapped = mapRun(run);
      actions.push({
        id: `action-lre-${run.id}`,
        risk_id: mapped.id,
        risk_text: mapped.text,
        action: act,
        severity: run.overall_status,
        value_source: mapped.value_source,
        display_label: mapped.display_label,
        machine_id: mapped.machine_id,
        detected_state: mapped.detected_state,
        provenance_tags: mapped.provenance_tags || [],
      });
    }
  }

  return {
    available: Boolean(latest),
    machine_id: machineId,
    latest_window: mapWindow(window),
    latest_run: recommendation,
    recommendation,
    risks,
    predictions,
    actions,
    latest_run_evaluation_id: latest?.id ?? null,
    value_source_note:
      "Client fallback from GET /live-run-evaluations + /live-feature-evaluations + /live-process-windows",
    from_fallback: true,
  };
}

/** Aggregate HIGH/MID/LOW counts from GET /baseline-registry list. */
export async function fetchBaselineCoverage(safeApi) {
  const res = await safeApi.get("/baseline-registry?limit=1000&offset=0");
  if (res?.fallback || !res?.data) return null;
  const rows = asList(res.data);
  const regimes = { HIGH: 0, MID: 0, LOW: 0 };
  const other = {};
  const features = new Set();
  for (const r of rows) {
    const key = String(r.regime_type || "").toUpperCase();
    if (key in regimes) regimes[key] += 1;
    else if (key) other[key] = (other[key] || 0) + 1;
    if (r.feature_name) features.add(r.feature_name);
  }
  const missing = ["HIGH", "MID", "LOW"].filter((k) => regimes[k] <= 0);
  const ready = missing.length === 0;
  return {
    regimes,
    other_regimes: other,
    total_rows: rows.length,
    features: [...features],
    missing_regimes: missing,
    ready_for_live_monitor: ready,
    hint: ready
      ? "HIGH/MID/LOW baselines present"
      : "Baseline-Registry unvollständig — Ammar populate_baseline prüfen",
  };
}

/** Session flags so we don't re-hit undeployed routes every poll (avoids 404/422 spam). */
const capability = {
  aiSnapshot: null, // null | true | false
  baselineCoverage: null, // null | "regimes-coverage" | "summary" | "list"
};

export async function loadAiSnapshotWithFallback(safeApi, opts = {}) {
  if (capability.aiSnapshot !== false) {
    const snapRes = await safeApi.get(
      `/operations-center/ai-snapshot?history_limit=${opts.historyLimit || 25}${
        opts.machineId ? `&machine_id=${encodeURIComponent(opts.machineId)}` : ""
      }`
    );
    if (!snapRes?.fallback && snapRes?.data && snapRes.data.available !== undefined) {
      capability.aiSnapshot = true;
      return { snapshot: snapRes.data, source: "ai-snapshot" };
    }
    capability.aiSnapshot = false;
  }
  // 404 / empty / missing route → compose from live_* APIs
  const snapshot = await fetchLiveAiSnapshot(safeApi, opts);
  return { snapshot, source: "live-apis" };
}

/**
 * Baseline HIGH/MID/LOW coverage via GET /baseline-registry list.
 * Avoids /summary and /regimes-coverage — on older remotes those paths hit
 * GET /{record_id:int} and return 422 every poll.
 */
export async function loadBaselineCoverageWithFallback(safeApi) {
  capability.baselineCoverage = "list";
  return fetchBaselineCoverage(safeApi);
}
