import { describe, expect, it } from "vitest";
import {
  buildDeviationHeatmap,
  heatCellClass,
  statusRank,
} from "./buildDeviationHeatmap";

describe("buildDeviationHeatmap", () => {
  it("ranks critical above warning", () => {
    expect(statusRank("CRITICAL")).toBeGreaterThan(statusRank("WARNING"));
    expect(statusRank("WARNING")).toBeGreaterThan(statusRank("NORMAL"));
  });

  it("builds machine × feature matrix from latest windows", () => {
    const machines = [
      { id: "m1", name: "Extruder A" },
      { id: "m2", name: "Extruder B" },
    ];
    const windows = [
      { id: 10, machine_id: "m1" },
      { id: 9, machine_id: "m1" },
      { id: 8, machine_id: "m2" },
    ];
    const evaluations = [
      {
        live_process_window_id: 10,
        feature_name: "pressure_mean",
        deviation_pct: 8,
        feature_status: "CRITICAL",
      },
      {
        live_process_window_id: 10,
        feature_name: "load_mean",
        deviation_pct: 1,
        feature_status: "NORMAL",
      },
      {
        live_process_window_id: 9,
        feature_name: "pressure_mean",
        deviation_pct: 99,
        feature_status: "CRITICAL",
      },
      {
        live_process_window_id: 8,
        feature_name: "pressure_mean",
        deviation_pct: 3,
        feature_status: "WARNING",
      },
    ];

    const { features, rows, counts } = buildDeviationHeatmap({
      machines,
      windows,
      evaluations,
    });

    expect(features).toEqual(["load_mean", "pressure_mean"]);
    expect(rows[0].machineName).toBe("Extruder A");
    expect(rows[0].cells.pressure_mean.deviation_pct).toBe(8);
    expect(rows[0].cells.pressure_mean.live_process_window_id).toBe(10);
    expect(counts.critical).toBe(1);
    expect(counts.warning).toBe(1);
    expect(heatCellClass(rows[0].cells.pressure_mean)).toContain("rose");
  });

  it("marks machines without evaluations as idle", () => {
    const { counts, rows } = buildDeviationHeatmap({
      machines: [{ id: "x", name: "Idle" }],
      windows: [],
      evaluations: [],
    });
    expect(counts.idle).toBe(1);
    expect(rows[0].hasData).toBe(false);
  });
});
