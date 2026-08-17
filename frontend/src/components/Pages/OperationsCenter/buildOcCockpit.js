/**
 * Build PDF-style cockpit view-models from OC overview + optional order board.
 */

const EVENT_TYPE_DE = {
  PROGRESS_RECOMPUTE: "Fortschritt neu berechnet",
  PROGRESS_RECOMPUTED: "Fortschritt neu berechnet",
  RUN_STARTED: "Lauf gestartet",
  RUN_STOPPED: "Lauf gestoppt",
  RUN_PAUSED: "Lauf pausiert",
  ALARM_RAISED: "Alarm ausgelöst",
  ALARM_CLEARED: "Alarm quittiert",
  IMPORT_COMPLETED: "Import abgeschlossen",
  STATE_CHANGE: "Statuswechsel",
};

function humanizeEventType(raw) {
  if (!raw) return "Ereignis";
  const key = String(raw).trim().toUpperCase();
  if (EVENT_TYPE_DE[key]) return EVENT_TYPE_DE[key];
  const spaced = String(raw).replace(/_/g, " ").trim();
  if (!spaced) return "Ereignis";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function buildReadinessFactors(connectedSources = [], dataQuality = null) {
  const has = (k) => connectedSources.includes(k);
  return [
    { key: "volume", label: "Sensordatenmenge", value: has("live_sensors") ? 100 : 0 },
    {
      key: "sensor_q",
      label: "Sensorqualität",
      value: dataQuality != null ? Math.round(Number(dataQuality)) : has("live_sensors") ? 70 : 0,
    },
    {
      key: "history",
      label: "Prozesshistorie",
      value: has("production_history") ? 100 : has("machine_state") ? 40 : 0,
    },
    { key: "quality", label: "Qualitätsdaten", value: has("quality_data") ? 100 : 0 },
    {
      key: "maint",
      label: "Wartungshistorie",
      value: has("maintenance_history") ? 100 : 0,
    },
  ];
}

/** Only accept Vorhersagebereitschaft when AI/ML explicitly reported it (not legacy formula). */
export function resolveMlPredictionReadiness(data) {
  const meta = data?.prediction_readiness_meta;
  const raw = data?.prediction_readiness;
  const available = meta?.available === true;
  const source = String(meta?.value_source || "").toUpperCase();
  if (!available || source !== "AI_SERVICE") {
    return {
      value: null,
      hint:
        meta?.hint ||
        "Vorhersagebereitschaft kommt vom AI/ML-Dienst — noch kein Score gemeldet.",
      meta: meta || null,
    };
  }
  if (raw == null || !Number.isFinite(Number(raw))) {
    return {
      value: null,
      hint: meta?.hint || "Noch kein AI/ML-Score für diese Maschine.",
      meta,
    };
  }
  return {
    value: Number(raw),
    hint: null,
    meta,
  };
}

const PLANT_STATUS_DE = {
  PRODUCTION: "PRODUKTION",
  READY: "BEREIT",
  HEATING: "AUFHEIZEN",
  COOLING: "ABKÜHLEN",
  FAULT: "STÖRUNG",
  STOPPED: "GESTOPPT",
};

export function buildTimelineEvents({
  plantStatus,
  warnings = [],
  risks = [],
  recentEvents = [],
  now = new Date(),
}) {
  const formatTime = (value) => {
    try {
      if (!value) return null;
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return null;
    }
  };

  const dated = [];

  for (const e of recentEvents.slice(0, 4)) {
    const raw = e.created_at || e.timestamp;
    const ts = raw ? new Date(raw).getTime() : NaN;
    dated.push({
      id: `prog-${e.id || raw || dated.length}-${e.event_type}`,
      time: formatTime(raw) || "—",
      sortAt: Number.isFinite(ts) ? ts : null,
      title: humanizeEventType(e.event_type),
      subtitle: e.source ? String(e.source) : null,
      tone: "info",
      value_source: "DERIVED",
    });
  }

  dated.sort((a, b) => {
    if (a.sortAt == null && b.sortAt == null) return 0;
    if (a.sortAt == null) return 1;
    if (b.sortAt == null) return -1;
    return a.sortAt - b.sortAt;
  });

  const events = [];

  if (plantStatus) {
    const key = String(plantStatus).toUpperCase();
    events.push({
      id: "plant-status",
      time: formatTime(now) || "—",
      title: "Anlagenstatus",
      subtitle: PLANT_STATUS_DE[key] || String(plantStatus),
      tone: key === "FAULT" ? "alarm" : "info",
      value_source: "LIVE",
    });
  }

  for (const e of dated) {
    const { sortAt, ...rest } = e;
    events.push(rest);
  }

  for (const w of warnings.slice(0, 2)) {
    const sev = String(w.severity || w.level || "").toLowerCase();
    events.push({
      id: `warn-${w.id}`,
      time: formatTime(w.created_at || w.timestamp || w.triggered_at) || "—",
      title: sev.includes("crit") || sev.includes("alarm") ? "Alarm" : "Warnung",
      subtitle: localizeRecommendationText(w.text),
      tone: sev.includes("crit") || sev.includes("alarm") ? "alarm" : "warn",
      value_source: w.value_source || "LIVE",
    });
  }

  for (const r of risks
    .filter((x) => String(x?.value_source || "").toUpperCase() !== "SIMULATED")
    .slice(0, 1)) {
    events.push({
      id: `risk-${r.id}`,
      time: formatTime(r.created_at || r.timestamp) || "—",
      title: "KI-Hinweis",
      subtitle: localizeRecommendationText(r.text),
      tone: "ai",
      value_source: r.value_source || "RULE_BASED",
    });
  }

  events.push({
    id: "now",
    time: formatTime(now) || "—",
    title: "Jetzt",
    subtitle: null,
    tone: "now",
    value_source: "LIVE",
  });

  return events.slice(0, 7);
}

export function pickRecommendation(risks = [], warnings = []) {
  const r =
    risks.find(
      (x) =>
        x.text && String(x.value_source || "").toUpperCase() !== "SIMULATED"
    ) || null;
  if (r) {
    return {
      text: localizeRecommendationText(r.text),
      action: r.action ? localizeRecommendationText(r.action) : null,
      value_source: r.value_source || "RULE_BASED",
      display_label: localizeProvenanceLabel(r.display_label, r.value_source),
    };
  }
  const w = warnings.find((x) => x.text);
  if (w) {
    return {
      text: localizeRecommendationText(w.text),
      action: null,
      value_source: w.value_source || "RULE_BASED",
      display_label: localizeProvenanceLabel(
        w.display_label || "Regelbasierte Warnung",
        w.value_source
      ),
    };
  }
  return null;
}

const REC_TEXT_DE = {
  "in 11 hours, the probability of a pressure loss rises to 82%.":
    "In 11 Stunden steigt die Wahrscheinlichkeit eines Druckverlusts auf 82%.",
  "tool is expected to reach the maintenance range in 34 days.":
    "Werkzeug erreicht voraussichtlich in 34 Tagen den Wartungsbereich.",
  "machine network not yet connected for remaining lines.":
    "Maschinennetzwerk für weitere Linien noch nicht verbunden.",
  "machine network not yet connected for remaining lines":
    "Maschinennetzwerk für weitere Linien noch nicht verbunden",
  "quality connection missing": "Qualitätsanbindung fehlt",
  "maintenance connection missing": "Wartungsanbindung fehlt",
  "waiting for live sensor data": "Warte auf Live-Sensordaten",
  "requires energy_data": "Erfordert Energiedaten",
  "motor load": "Motorlast",
  "screw speed": "Schneckendrehzahl",
  "extruder pressure": "Extruderdruck",
  "avg. temperature": "Durchschnittstemperatur",
  "zone 3 temperature": "Zone-3-Temperatur",
  energy: "Energie",
};

const PROVENANCE_LABEL_DE = {
  "demo prediction": "Demo-Vorhersage",
  derived: "Abgeleitet",
  "rule-based warning": "Regelbasierte Warnung",
};

export function localizeUiText(text) {
  if (!text) return text;
  const mapped = REC_TEXT_DE[String(text).trim().toLowerCase()];
  return mapped || text;
}

function localizeRecommendationText(text) {
  return localizeUiText(text);
}

function localizeProvenanceLabel(label, source) {
  if (label) {
    const mapped = PROVENANCE_LABEL_DE[String(label).trim().toLowerCase()];
    if (mapped) return mapped;
    return label;
  }
  if (source === "SIMULATED") return "Demo-Vorhersage";
  if (source === "RULE_BASED") return "Regelbasierte Warnung";
  if (source === "DERIVED") return "Abgeleitet";
  return label;
}

export function mapOrderBoardToRunBar(board) {
  if (!board) return null;
  const fields = board.fields || {};
  const run = board.run || {};

  const fieldValue = (key) => {
    const cell = fields[key];
    if (cell == null) return null;
    if (typeof cell === "string" || typeof cell === "number") return cell;
    if (typeof cell !== "object") return null;
    if (cell.available === false) return null;
    const raw = cell.value ?? cell.display;
    if (raw == null || raw === "—" || raw === "") return null;
    if (typeof raw === "object") return null;
    return raw;
  };

  const asFinite = (v) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const asText = (v) => {
    if (v == null || v === "") return null;
    if (typeof v === "object") return null;
    return String(v);
  };

  const order =
    asText(fieldValue("customer")) ||
    asText(fieldValue("product")) ||
    asText(run.customer_order) ||
    asText(run.product_name) ||
    (run.id != null ? `#${run.id}` : null);

  const line =
    asText(fieldValue("machine")) ||
    asText(board.machine_name) ||
    asText(run.machine_name) ||
    null;

  const elapsedMin = asFinite(fieldValue("elapsed") ?? run.elapsed_minutes);
  const produced = asFinite(fieldValue("actual") ?? run.actual_qty);
  const scrap = asFinite(fieldValue("scrap") ?? run.scrap_percentage);
  const oee = asFinite(fieldValue("oee") ?? run.oee);

  return {
    id: run.id,
    order_label: order,
    line_label: line,
    runtime: elapsedMin != null ? formatRuntime(elapsedMin) : null,
    produced,
    scrap,
    oee,
  };
}

function formatRuntime(minutes) {
  const totalSec = Math.max(0, Math.round(Number(minutes) * 60));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Count real alarms only for the Aktive-Alarme KPI.
 * Skips DERIVED network/setup notes (e.g. “Maschinennetzwerk noch nicht verbunden”).
 */
export function countAlarmSeverities(warnings = []) {
  let critical = 0;
  let warning = 0;
  for (const w of warnings) {
    const id = String(w.id || "");
    const source = String(w.value_source || "").toUpperCase();
    // Informational OC notes — not plant alarms
    if (id === "network-note" || id.startsWith("machine-offline-")) continue;
    if (source === "DERIVED" && !w.severity && !w.level) continue;

    const s = String(w.severity || w.level || "").toLowerCase();
    if (s.includes("crit") || s.includes("high") || s.includes("alarm")) critical += 1;
    else if (s.includes("warn") || s.includes("medium") || s.includes("low") || s) warning += 1;
    else if (source === "LIVE") warning += 1;
  }
  return { critical, warning };
}
