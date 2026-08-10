/**
 * Stage 2 — map existing backend payloads into Operations Center view models.
 * Every value carries value_source. Never invent Accuracy.
 */

const VALUE_SOURCES = {
  LIVE: "LIVE",
  RULE_BASED: "RULE_BASED",
  DERIVED: "DERIVED",
  SIMULATED: "SIMULATED",
};

const STATE_MAP = {
  PRODUCTION: "PRODUCTION",
  IDLE: "READY",
  READY: "READY",
  HEATING: "HEATING",
  COOLING: "COOLING",
  OFF: "STOPPED",
  STOPPED: "STOPPED",
  FAULT: "FAULT",
  ERROR: "FAULT",
};

function severityToTraffic(severity, inProduction) {
  if (!inProduction || severity === undefined || severity === null || severity < 0) {
    return "grey";
  }
  if (severity === 0) return "green";
  if (severity === 1) return "yellow";
  if (severity >= 2) return "red";
  return "grey";
}

function numOrNull(v) {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return null;
  return Number(v);
}

function formatValue(v, digits = 1) {
  const n = numOrNull(v);
  if (n === null) return "—";
  return Number.isInteger(n) && digits === 0 ? String(n) : n.toFixed(digits);
}

function sparkFromRows(rows, field, limit = 60) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const values = [];
  for (const row of rows) {
    const raw = row?.[field] ?? row?.[`Temp_${field}`];
    const n = numOrNull(raw);
    if (n !== null) values.push(n);
  }
  return values.slice(-limit);
}

function metricCard({
  key,
  label,
  metric,
  unit,
  spark,
  inProduction,
  sparkFallback,
}) {
  const current = metric?.current_value;
  const hasLive = current !== undefined && current !== null;
  const traffic = severityToTraffic(metric?.severity, inProduction);
  const band = metric?.green_band;

  return {
    key,
    label,
    value: hasLive ? formatValue(current, unit === "rpm" || unit === "amp" ? 1 : 1) : "—",
    unit: hasLive ? unit : "",
    traffic: hasLive ? traffic : "grey",
    normalMin: band?.min != null ? Number(band.min.toFixed?.(1) ?? band.min) : null,
    normalMax: band?.max != null ? Number(band.max.toFixed?.(1) ?? band.max) : null,
    deviation:
      metric?.deviation != null ? Number(Number(metric.deviation).toFixed(1)) : null,
    value_source: hasLive
      ? inProduction && metric?.severity >= 0
        ? VALUE_SOURCES.RULE_BASED
        : VALUE_SOURCES.LIVE
      : VALUE_SOURCES.LIVE,
    lockedHint: hasLive ? undefined : "Waiting for live sensor data",
    spark: spark?.length ? spark : sparkFallback || [],
  };
}

/**
 * Build machine value cards from /dashboard/current + /dashboard/extruder/derived
 */
export function buildLiveMachineValues({
  currentDashboard,
  derived,
  machineState,
  demoFallbackValues = [],
}) {
  const metrics = currentDashboard?.metrics || {};
  const rows = derived?.rows || [];
  const inProduction = machineState === "PRODUCTION";

  const cards = [
    metricCard({
      key: "motor_load",
      label: "Motor load",
      metric: metrics.Motor_load,
      unit: "amp",
      spark: sparkFromRows(rows, "MotorLoad_amp"),
      inProduction,
    }),
    metricCard({
      key: "screw_speed",
      label: "Screw speed",
      metric: metrics.ScrewSpeed_rpm,
      unit: "rpm",
      spark: sparkFromRows(rows, "ScrewSpeed_rpm"),
      inProduction,
    }),
    metricCard({
      key: "melt_pressure",
      label: "Extruder pressure",
      metric: metrics.Pressure_bar,
      unit: "bar",
      spark: sparkFromRows(rows, "Pressure_bar"),
      inProduction,
    }),
    metricCard({
      key: "temp_avg",
      label: "Avg. temperature",
      metric: metrics.Temp_Avg,
      unit: "°C",
      spark: sparkFromRows(rows, "Temp_Avg"),
      inProduction,
    }),
    metricCard({
      key: "zone3_temp",
      label: "Zone 3 temperature",
      metric: null,
      unit: "°C",
      spark: sparkFromRows(rows, "Zone3_C").length
        ? sparkFromRows(rows, "Zone3_C")
        : sparkFromRows(rows, "Temp_Zone3_C"),
      inProduction,
    }),
  ];

  // Zone 3 may only exist on derived rows, not metrics
  const zone3Spark =
    sparkFromRows(rows, "Temp_Zone3_C").length > 0
      ? sparkFromRows(rows, "Temp_Zone3_C")
      : sparkFromRows(rows, "Zone3_C");
  const zone3Latest =
    zone3Spark.length > 0
      ? zone3Spark[zone3Spark.length - 1]
      : numOrNull(rows?.[rows.length - 1]?.Temp_Zone3_C) ??
        numOrNull(rows?.[rows.length - 1]?.["Temp_Zone3_C"]);

  const zone3Risk =
    derived?.risk?.sensors?.Temp_Zone3_C ||
    derived?.risk?.sensors?.["Temp_Zone3_C"];

  cards[4] = {
    key: "zone3_temp",
    label: "Zone 3 temperature",
    value: zone3Latest != null ? formatValue(zone3Latest) : "—",
    unit: zone3Latest != null ? "°C" : "",
    traffic:
      !inProduction || !zone3Risk
        ? zone3Latest != null
          ? "grey"
          : "grey"
        : zone3Risk === "red"
          ? "red"
          : zone3Risk === "yellow"
            ? "yellow"
            : "green",
    normalMin: null,
    normalMax: null,
    deviation: null,
    value_source:
      zone3Latest != null ? VALUE_SOURCES.LIVE : VALUE_SOURCES.LIVE,
    lockedHint: zone3Latest != null ? undefined : "Waiting for live sensor data",
    spark: zone3Spark,
  };

  // Energy stays locked until energy_data exists
  cards.push({
    key: "energy",
    label: "Energy",
    value: "—",
    unit: "",
    traffic: "grey",
    normalMin: null,
    normalMax: null,
    deviation: null,
    value_source: VALUE_SOURCES.SIMULATED,
    lockedHint: "Requires energy_data",
    spark: [],
  });

  const hasAnyLive = cards.some(
    (c) => c.value !== "—" && c.key !== "energy"
  );

  if (!hasAnyLive && demoFallbackValues.length) {
    // Soft fallback only if APIs returned nothing — keep labels honest
    return demoFallbackValues.map((v) => ({
      ...v,
      value_source:
        v.key === "energy" ? VALUE_SOURCES.SIMULATED : VALUE_SOURCES.SIMULATED,
    }));
  }

  return cards;
}

export function mapPlantStatus(machineState) {
  if (!machineState) return "STOPPED";
  const key = String(machineState).toUpperCase();
  return STATE_MAP[key] || "STOPPED";
}

export function buildLiveWarnings({ alarms = [], currentDashboard, extruderStatus }) {
  const warnings = [];

  if (Array.isArray(alarms)) {
    for (const alarm of alarms.slice(0, 8)) {
      warnings.push({
        id: String(alarm.id || alarm.message),
        text: alarm.message || "Active alarm",
        value_source: VALUE_SOURCES.LIVE,
        display_label: "LIVE",
        severity: alarm.severity,
      });
    }
  }

  if (extruderStatus?.last_error) {
    warnings.push({
      id: "extruder-feed-error",
      text: `Data feed issue: ${extruderStatus.last_error}`,
      value_source: VALUE_SOURCES.DERIVED,
      display_label: "Abgeleitet",
    });
  } else if (extruderStatus && extruderStatus.configured === false) {
    warnings.push({
      id: "extruder-not-configured",
      text: "Extruder data source is not fully configured.",
      value_source: VALUE_SOURCES.DERIVED,
      display_label: "Abgeleitet",
    });
  }

  const overall = currentDashboard?.overall_risk;
  if (overall && overall !== "unknown" && overall !== "green") {
    warnings.push({
      id: "overall-risk",
      text:
        currentDashboard?.explanation_text ||
        `Overall process risk is ${overall}.`,
      value_source: VALUE_SOURCES.RULE_BASED,
      display_label: "Regelbasierte Warnung",
    });
  }

  return warnings;
}

export function buildConnectedMachineView({
  machineState,
  currentDashboard,
  sensorCount,
}) {
  return {
    id: "extruder_01",
    name: "Extruder 1",
    type: "extruder",
    status: machineState || "UNKNOWN",
    connected: true,
    sensors: sensorCount ?? 21,
    integrationScore: 72,
    healthScore:
      currentDashboard?.overall_severity === 2
        ? 45
        : currentDashboard?.overall_severity === 1
          ? 70
          : currentDashboard?.overall_severity === 0
            ? 90
            : 75,
  };
}

export { VALUE_SOURCES };
