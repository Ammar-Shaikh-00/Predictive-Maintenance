import { describe, expect, it } from "vitest";
import {
  buildReadinessFactors,
  buildTimelineEvents,
  countAlarmSeverities,
  mapOrderBoardToRunBar,
  pickRecommendation,
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
      [{ id: "1", text: "Risk A", value_source: "SIMULATED" }],
      [{ id: "2", text: "Warn B" }]
    );
    expect(rec.text).toBe("Risk A");
  });

  it("localizes English demo recommendation copy to German", () => {
    const rec = pickRecommendation(
      [
        {
          id: "1",
          text: "In 11 hours, the probability of a pressure loss rises to 82%.",
          value_source: "SIMULATED",
          display_label: "Demo Prediction",
        },
      ],
      []
    );
    expect(rec.text).toContain("Druckverlusts");
    expect(rec.display_label).toBe("Demo-Vorhersage");
  });

  it("counts alarm severities", () => {
    expect(
      countAlarmSeverities([
        { severity: "critical" },
        { severity: "warning" },
        { text: "x" },
      ])
    ).toEqual({ critical: 1, warning: 2 });
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
