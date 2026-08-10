import { describe, expect, it } from "vitest";
import {
  computeDigitalizationProgress,
  computePredictionReadiness,
  evaluateFeatures,
  toggleSource,
} from "./capabilityEngine";

describe("capabilityEngine", () => {
  it("computes digitalization from connected source weights", () => {
    const progress = computeDigitalizationProgress([
      "ai_server",
      "machine_data",
      "machine_state",
      "live_sensors",
    ]);
    // 10+15+10+10 = 45
    expect(progress).toBe(45);
  });

  it("locks features until required sources exist", () => {
    const features = evaluateFeatures(
      [
        {
          key: "quality",
          name: "Quality",
          requires: ["quality_data"],
          benefit: "x",
        },
      ],
      ["machine_data"]
    );
    expect(features[0].status).toBe("locked");
    expect(features[0].missingSources).toEqual(["quality_data"]);
  });

  it("activates features when requirements are met", () => {
    const features = evaluateFeatures(
      [
        {
          key: "quality",
          name: "Quality",
          requires: ["quality_data"],
          benefit: "x",
        },
      ],
      ["quality_data"]
    );
    expect(features[0].status).toBe("active");
    expect(features[0].isAvailable).toBe(true);
  });

  it("boosts readiness when optional sources connect", () => {
    const base = computePredictionReadiness([], 42, { quality_data: 14 });
    const withQuality = computePredictionReadiness(
      ["quality_data"],
      42,
      { quality_data: 14 }
    );
    expect(base).toBe(42);
    expect(withQuality).toBe(56);
  });

  it("toggles sources between connected and missing", () => {
    const next = toggleSource("quality_data", ["machine_data"], ["quality_data"]);
    expect(next.connectedSources).toContain("quality_data");
    expect(next.missingSources).not.toContain("quality_data");
  });
});
