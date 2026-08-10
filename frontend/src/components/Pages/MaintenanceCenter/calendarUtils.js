/**
 * Group calendar events by YYYY-MM for month view.
 */
export function groupCalendarByMonth(events = [], monthKey) {
  const rows = (events || []).filter((e) => {
    if (!monthKey) return true;
    return String(e.date || "").startsWith(monthKey);
  });
  const byDate = {};
  for (const e of rows) {
    const d = e.date || "unknown";
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(e);
  }
  return Object.keys(byDate)
    .sort()
    .map((date) => ({ date, events: byDate[date] }));
}

export function currentMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
