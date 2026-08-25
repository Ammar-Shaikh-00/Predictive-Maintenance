/**
 * View helpers for the Operations Center capability scorecard.
 * Frontend only partitions API rows — no local weights or invented Accuracy.
 */

export function partitionScorecard(capability) {
  const components = Array.isArray(capability?.components)
    ? capability.components
    : [];
  const digitalization = components
    .filter((row) => row.show_on_scorecard && row.contributes_to_digitalization)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const mlLayer = components
    .filter(
      (row) =>
        row.show_on_scorecard &&
        !row.contributes_to_digitalization &&
        row.category === "ml"
    )
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const unlocks = [];
  const seen = new Set();
  for (const row of digitalization) {
    if (row.status !== "locked") continue;
    for (const item of row.unlocks || []) {
      const key = item.feature_key || item.label_de;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unlocks.push({
        key,
        name: item.label_de || key,
        requires: [row.label_de || row.component_key],
        missingSources: [row.component_key],
        status: "locked",
      });
    }
  }

  return { digitalization, mlLayer, unlocks };
}

export function healthTone(workPct, status, bands = {}) {
  if (status === "locked") return "locked";
  const pct = Number(workPct);
  const greenMin = Number(bands.green_min ?? 80);
  const yellowMin = Number(bands.yellow_min ?? 40);
  if (status === "degraded") return "warn";
  if (!Number.isFinite(pct) || pct <= 0) return "locked";
  if (pct >= greenMin) return "ok";
  if (pct >= yellowMin) return "warn";
  return "bad";
}

export function unlockLabel(row) {
  const labels = (row?.unlocks || [])
    .map((item) => item.label_de)
    .filter(Boolean);
  if (!labels.length) return null;
  return `Schaltet frei: ${labels.join(" · ")}`;
}
