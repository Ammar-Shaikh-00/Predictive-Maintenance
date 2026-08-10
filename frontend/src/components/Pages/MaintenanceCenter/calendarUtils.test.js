import { describe, expect, it } from "vitest";
import { groupCalendarByMonth } from "./calendarUtils";

describe("groupCalendarByMonth", () => {
  it("filters to month and groups by date", () => {
    const grouped = groupCalendarByMonth(
      [
        { date: "2026-07-01", title: "A" },
        { date: "2026-07-01", title: "B" },
        { date: "2026-08-02", title: "C" },
      ],
      "2026-07"
    );
    expect(grouped).toHaveLength(1);
    expect(grouped[0].events).toHaveLength(2);
  });
});
