import { describe, expect, it } from "vitest";
import {
  buildExtruderLineCards,
  DEFAULT_EXTRUDER_SLOTS,
} from "./ProductionMap";

describe("buildExtruderLineCards", () => {
  it("always exposes Extruder 1–5 labels (no Dosierung/Siebwechsler)", () => {
    const cards = buildExtruderLineCards({
      connectedMachine: { id: "a", name: "Line Extruder", status: "PRODUCTION" },
      greyMachines: [],
    });
    expect(cards).toHaveLength(5);
    expect(cards.map((c) => c.name)).toEqual([
      "EXTRUDER 1",
      "EXTRUDER 2",
      "EXTRUDER 3",
      "EXTRUDER 4",
      "EXTRUDER 5",
    ]);
    expect(DEFAULT_EXTRUDER_SLOTS.every((s) => s.name.startsWith("EXTRUDER"))).toBe(
      true
    );
  });

  it("marks first slot ok when connected machine is in production", () => {
    const cards = buildExtruderLineCards({
      connectedMachine: { id: "a", name: "E1", status: "PRODUCTION", since: "08:35" },
      greyMachines: [{ id: "b", name: "E2", status: "OFFLINE" }],
    });
    expect(cards[0].statusKey).toBe("ok");
    expect(cards[1].statusKey).toBe("offline");
  });
});
