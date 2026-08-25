/**
 * Lightweight Stage-1 capability engine.
 * Calculates digitalization progress, prediction readiness, and feature locks
 * from connected sources — no ML required.
 */

import {
  DIGITALIZATION_WEIGHTS,
  SOURCE_LABELS,
} from "../config/operationsCenterDemo";

/** Not data sources in this product — never show as digitalization checks. */
export const COSMETIC_SOURCE_KEYS = new Set([
  "vpn",
  "sql_database",
  "user_management",
]);

const CHECKLIST_EXTRA_KEYS = ["opc_ua", "erp"];

export function sourceLabel(key) {
  return SOURCE_LABELS[key] || key.replace(/_/g, " ");
}

/**
 * Honest checklist from backend connected/missing sources.
 * Never marks VPN, SQL-Datenbank, or Benutzerverwaltung as done.
 */
export function buildDigitalizationChecklist(
  connectedSources = [],
  missingSources = []
) {
  const connected = new Set(
    (connectedSources || []).filter((key) => !COSMETIC_SOURCE_KEYS.has(key))
  );
  const catalog = [
    ...Object.keys(DIGITALIZATION_WEIGHTS),
    ...CHECKLIST_EXTRA_KEYS,
    ...(missingSources || []),
    ...connected,
  ];
  const seen = new Set();
  const keys = [];
  for (const key of catalog) {
    if (!key || COSMETIC_SOURCE_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }

  const done = keys
    .filter((key) => connected.has(key))
    .map((key) => ({ key, label: sourceLabel(key) }));
  const open = keys
    .filter((key) => !connected.has(key))
    .map((key) => ({ key, label: sourceLabel(key) }));

  return { done, open };
}

/**
 * Sum weights for connected sources that appear in DIGITALIZATION_WEIGHTS.
 */
export function computeDigitalizationProgress(connectedSources = []) {
  const set = new Set(connectedSources);
  let total = 0;
  for (const [key, weight] of Object.entries(DIGITALIZATION_WEIGHTS)) {
    if (set.has(key)) total += weight;
  }
  return Math.min(100, Math.round(total));
}

/**
 * Base readiness + boosts for optional sources that are connected.
 */
export function computePredictionReadiness(
  connectedSources = [],
  baseReadiness = 42,
  readinessBoost = {}
) {
  const set = new Set(connectedSources);
  let score = baseReadiness;
  for (const [key, boost] of Object.entries(readinessBoost)) {
    if (set.has(key)) score += boost;
  }
  return Math.min(100, Math.round(score));
}

/**
 * Evaluate feature availability from required sources.
 * @returns {Array} features with status + missingSources
 */
export function evaluateFeatures(features = [], connectedSources = []) {
  const set = new Set(connectedSources);

  return features.map((feature) => {
    const requires = feature.requires || [];
    const missingSources = requires.filter((s) => !set.has(s));
    const met = requires.length - missingSources.length;

    let status = "locked";
    if (missingSources.length === 0) {
      status = "active";
    } else if (met > 0) {
      status = "partially_available";
    } else if (feature.status === "partially_available") {
      // keep explicit demo override only if still partially unmet
      status = missingSources.length < requires.length ? "partially_available" : "locked";
    }

    return {
      ...feature,
      status,
      missingSources,
      isAvailable: missingSources.length === 0,
    };
  });
}

/**
 * Connect or disconnect a source; returns next connected + missing lists.
 */
export function toggleSource(sourceKey, connectedSources, missingSources) {
  const connected = new Set(connectedSources);
  const missing = new Set(missingSources);

  if (connected.has(sourceKey)) {
    connected.delete(sourceKey);
    missing.add(sourceKey);
  } else {
    connected.add(sourceKey);
    missing.delete(sourceKey);
  }

  return {
    connectedSources: Array.from(connected),
    missingSources: Array.from(missing),
  };
}

export function hasSimulatedContent(warnings = [], risks = [], machineValues = []) {
  const all = [...warnings, ...risks, ...machineValues];
  return all.some((item) => item.value_source === "SIMULATED");
}
