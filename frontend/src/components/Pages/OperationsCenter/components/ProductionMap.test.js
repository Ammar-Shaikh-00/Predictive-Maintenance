import { describe, expect, it } from "vitest";
import {
  buildOpenMachineCards,
  connectedStatusLabel,
  isMachineOpen,
  statusKeyForOpenMachine,
} from "./ProductionMap";

describe("buildOpenMachineCards", () => {
  it("shows only connected / live-feed machines as open cards", () => {
    const cards = buildOpenMachineCards({
      lineMachines: [
        {
          id: "extruder_01",
          name: "Extruder 1",
          connected: true,
          has_live_feed: true,
          status: "STOPPED",
        },
        {
          id: "extruder_02",
          name: "Extruder 2",
          connected: false,
          has_live_feed: false,
          status: "NOT_CONNECTED",
        },
        {
          id: "extruder_03",
          name: "Extruder 3",
          connected: false,
          status: "NOT_CONNECTED",
        },
      ],
    });
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("extruder_01");
    expect(cards[0].name).toBe("Extruder 1");
    expect(cards[0].statusKey).toBe("stopped");
  });

  it("does not invent Extruder 2–5 when only one machine has data", () => {
    const cards = buildOpenMachineCards({
      connectedMachine: {
        id: "a",
        name: "Line Extruder",
        status: "PRODUCTION",
        connected: true,
        has_live_feed: true,
      },
      lineMachines: [],
    });
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe("Line Extruder");
    expect(cards[0].statusKey).toBe("ok");
  });

  it("treats STOPPED connected machines as Verbunden, not Getrennt", () => {
    expect(
      statusKeyForOpenMachine({
        connected: true,
        status: "STOPPED",
        has_live_feed: true,
      })
    ).toBe("stopped");
    expect(isMachineOpen({ connected: false, has_live_feed: false })).toBe(
      false
    );
    expect(isMachineOpen({ connected: true })).toBe(true);
  });

  it("labels connected stopped as Verbunden / Gestoppt", () => {
    expect(connectedStatusLabel("stopped")).toBe("Verbunden / Gestoppt");
    expect(connectedStatusLabel("ok")).toBe("Verbunden / Läuft");
    expect(connectedStatusLabel("offline")).toBe("Nicht angebunden");
  });
});
