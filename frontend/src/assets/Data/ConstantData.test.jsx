import { describe, expect, it } from "vitest";
import React from "react";
import {
  getMachineStateUI,
  machineCriticalityColor,
  menuData,
} from "./ConstantData";

describe("ConstantData sanity checks", () => {
  it("includes expected operations center menu route", () => {
    expect(Array.isArray(menuData)).toBe(true);

    const flatten = (items = []) =>
      items.flatMap((item) => [item, ...flatten(item.children || [])]);
    const allItems = menuData.flatMap((section) => flatten(section.items ?? []));
    const operationsItem = allItems.find((item) => item.path === "/");

    expect(operationsItem).toBeDefined();
    expect(operationsItem?.label).toBe("Betriebszentrale");

    expect(allItems.find((item) => item.path === "/executive")).toBeDefined();

    const classicDashboard = allItems.find((item) => item.path === "/dashboard");
    expect(classicDashboard).toBeUndefined();

    expect(allItems.find((item) => item.path === "/maintenance")).toBeDefined();
    expect(allItems.find((item) => item.path === "/maintenance-history")).toBeDefined();
    expect(allItems.find((item) => item.path === "/energy")).toBeDefined();
    expect(allItems.find((item) => item.path === "/energy-history")).toBeDefined();
    expect(allItems.find((item) => item.path === "/quality-history")).toBeDefined();
    expect(allItems.find((item) => item.path === "/material-batches")).toBeDefined();
  });

  it("keeps high criticality color configured", () => {
    expect(machineCriticalityColor.high).toBe("#734961");
  });

  it("returns a valid React element for a known machine state", () => {
    const node = getMachineStateUI("OFF");
    expect(React.isValidElement(node)).toBe(true);
  });

  it("returns null for unknown machine state", () => {
    expect(getMachineStateUI("UNKNOWN_STATE")).toBeNull();
  });
});
