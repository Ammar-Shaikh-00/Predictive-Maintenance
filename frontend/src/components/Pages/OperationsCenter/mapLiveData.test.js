import { describe, expect, it } from "vitest";
import {
  buildLiveMachineValues,
  buildLiveWarnings,
  mapPlantStatus,
} from "./mapLiveData";

describe("mapLiveData", () => {
  it("maps machine states to plant status", () => {
    expect(mapPlantStatus("PRODUCTION")).toBe("PRODUCTION");
    expect(mapPlantStatus("IDLE")).toBe("READY");
    expect(mapPlantStatus("HEATING")).toBe("HEATING");
    expect(mapPlantStatus("OFF")).toBe("STOPPED");
  });

  it("builds live metric cards with provenance", () => {
    const cards = buildLiveMachineValues({
      currentDashboard: {
        metrics: {
          Motor_load: {
            current_value: 12.5,
            severity: 0,
            green_band: { min: 10, max: 20 },
            deviation: 0.5,
          },
          ScrewSpeed_rpm: { current_value: 40, severity: 1 },
          Pressure_bar: { current_value: 180, severity: 2 },
          Temp_Avg: { current_value: 210, severity: 0 },
        },
      },
      derived: { rows: [{ MotorLoad_amp: 12 }, { MotorLoad_amp: 12.5 }] },
      machineState: "PRODUCTION",
    });

    const motor = cards.find((c) => c.key === "motor_load");
    expect(motor.value).toBe("12.5");
    expect(motor.traffic).toBe("green");
    expect(["LIVE", "RULE_BASED"]).toContain(motor.value_source);

    const energy = cards.find((c) => c.key === "energy");
    expect(energy.value).toBe("—");
  });

  it("maps alarms to live warnings", () => {
    const warnings = buildLiveWarnings({
      alarms: [{ id: 1, message: "Pressure high", severity: "high" }],
      currentDashboard: null,
      extruderStatus: null,
    });
    expect(warnings[0].value_source).toBe("LIVE");
    expect(warnings[0].text).toContain("Pressure");
  });
});
