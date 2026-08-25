import { describe, expect, it } from "vitest";
import { healthTone, partitionScorecard, unlockLabel } from "./scorecardView";

const sample = {
  digitalization_progress: 55,
  health_bands: { green_min: 80, yellow_min: 40, red_max: 39 },
  components: [
    {
      component_key: "ai_server",
      label_de: "KI-Server",
      show_on_scorecard: true,
      contributes_to_digitalization: true,
      status: "active",
      work_pct: 100,
      sort_order: 10,
      unlocks: [],
    },
    {
      component_key: "quality_data",
      label_de: "Qualitätsdaten",
      show_on_scorecard: true,
      contributes_to_digitalization: true,
      status: "locked",
      work_pct: 0,
      sort_order: 60,
      unlocks: [
        { feature_key: "scrap_prediction", label_de: "Ausschussvorhersage" },
      ],
    },
    {
      component_key: "anomaly_models",
      label_de: "Anomalie-Modelle",
      category: "ml",
      show_on_scorecard: true,
      contributes_to_digitalization: false,
      status: "active",
      work_pct: 100,
      sort_order: 230,
      unlocks: [],
    },
    {
      component_key: "opc_ua",
      label_de: "OPC-UA",
      show_on_scorecard: false,
      contributes_to_digitalization: false,
      status: "locked",
      work_pct: 0,
      sort_order: 120,
      unlocks: [],
    },
  ],
};

describe("scorecardView", () => {
  it("splits digitalization rows from ML layer and skips hidden integrations", () => {
    const { digitalization, mlLayer, unlocks } = partitionScorecard(sample);
    expect(digitalization.map((r) => r.component_key)).toEqual([
      "ai_server",
      "quality_data",
    ]);
    expect(mlLayer.map((r) => r.component_key)).toEqual(["anomaly_models"]);
    expect(unlocks[0].name).toBe("Ausschussvorhersage");
  });

  it("maps health tones without inventing accuracy", () => {
    expect(healthTone(100, "active", sample.health_bands)).toBe("ok");
    expect(healthTone(40, "degraded", sample.health_bands)).toBe("warn");
    expect(healthTone(0, "locked", sample.health_bands)).toBe("locked");
    expect(unlockLabel(sample.components[1])).toContain("Ausschussvorhersage");
  });
});
