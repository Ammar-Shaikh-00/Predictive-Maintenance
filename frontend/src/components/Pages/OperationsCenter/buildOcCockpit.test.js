import { describe, expect, it } from "vitest";
import {
  buildReadinessFactors,
  buildTimelineEvents,
  countAlarmSeverities,
  mapOrderBoardToRunBar,
  pickRecommendation,
  resolveMlPredictionReadiness,
} from "./buildOcCockpit";

describe("buildOcCockpit", () => {
  it("builds readiness factors from connected sources", () => {
    const factors = buildReadinessFactors(["live_sensors", "quality_data"], 80);
    expect(factors.find((f) => f.key === "volume").value).toBe(100);
    expect(factors.find((f) => f.key === "quality").value).toBe(100);
    expect(factors.find((f) => f.key === "maint").value).toBe(0);
  });

  it("always ends timeline with current moment", () => {
    const events = buildTimelineEvents({
      plantStatus: "PRODUCTION",
      warnings: [],
      risks: [],
      recentEvents: [],
      now: new Date("2026-08-06T12:00:00Z"),
    });
    expect(events[events.length - 1].tone).toBe("now");
  });

  it("humanizes raw event_type codes for timeline titles", () => {
    const events = buildTimelineEvents({
      plantStatus: null,
      warnings: [],
      risks: [],
      recentEvents: [
        {
          id: 1,
          event_type: "PROGRESS_RECOMPUTE",
          created_at: "2026-08-06T12:15:00Z",
        },
      ],
      now: new Date("2026-08-06T12:00:00Z"),
    });
    expect(events.some((e) => e.title === "Fortschritt neu berechnet")).toBe(
      true
    );
  });

  it("picks recommendation from risks first", () => {
    const rec = pickRecommendation(
      [{ id: "1", text: "Risk A", value_source: "RULE_BASED" }],
      [{ id: "2", text: "Warn B" }]
    );
    expect(rec.text).toBe("Risk A");
  });

  it("skips SIMULATED risks and falls back to warnings", () => {
    const rec = pickRecommendation(
      [{ id: "1", text: "Fake risk", value_source: "SIMULATED" }],
      [{ id: "2", text: "Warn B", value_source: "LIVE" }]
    );
    expect(rec.text).toBe("Warn B");
  });

  it("localizes English recommendation copy to German", () => {
    const rec = pickRecommendation(
      [
        {
          id: "1",
          text: "In 11 hours, the probability of a pressure loss rises to 82%.",
          value_source: "RULE_BASED",
          display_label: "Rule-based Warning",
        },
      ],
      []
    );
    expect(rec.text).toContain("Druckverlusts");
  });

  it("counts alarm severities", () => {
    expect(
      countAlarmSeverities([
        { severity: "critical" },
        { severity: "warning" },
        { text: "x", value_source: "LIVE" },
      ])
    ).toEqual({ critical: 1, warning: 2 });
  });

  it("ignores DERIVED network notes in alarm KPI", () => {
    expect(
      countAlarmSeverities([
        {
          id: "network-note",
          text: "Maschinennetzwerk noch nicht verbunden",
          value_source: "DERIVED",
        },
      ])
    ).toEqual({ critical: 0, warning: 0 });
  });

  it("rejects legacy readiness without AI/ML available flag", () => {
    expect(
      resolveMlPredictionReadiness({
        prediction_readiness: 38,
        prediction_readiness_meta: { available: false, value_source: "DERIVED" },
      })
    ).toMatchObject({
      value: null,
      meta: { available: false, value_source: "DERIVED" },
    });
    expect(
      resolveMlPredictionReadiness({
        prediction_readiness: 72,
        prediction_readiness_meta: { available: true, value_source: "AI_SERVICE" },
      }).value
    ).toBe(72);
  });

  it("maps order board without [object Object] / NaN", () => {
    const run = mapOrderBoardToRunBar({
      machine_name: "Extruder",
      run: { id: 22, actual_qty: null },
      fields: {
        customer: {
          value: null,
          display: "—",
          available: false,
        },
        product: {
          value: "ToyA",
          display: "ToyA",
          available: true,
        },
        machine: {
          value: "Extruder",
          display: "Extruder",
          available: true,
        },
        elapsed: {
          value: 377.7,
          display: 377.7,
          available: true,
        },
        actual: {
          value: null,
          display: "—",
          available: false,
        },
      },
    });
    expect(run.order_label).toBe("ToyA");
    expect(run.line_label).toBe("Extruder");
    expect(String(run.order_label)).not.toContain("object");
    expect(run.produced).toBeNull();
    expect(run.runtime).toMatch(/^\d{2}:\d{2}/);
  });
});
