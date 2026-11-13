import { describe, it, expect } from "vitest";
import { weekDates, monthDates, addDays, formatPlannedHours, cellText, isOvernight } from "./shiftGrid";
import type { PlannedShift } from "@/lib/api-client";

const shift = (o: Partial<PlannedShift>): PlannedShift => ({
  shift_type_id: null, name: null, short_code: null, color: null,
  start_time: "09:00", end_time: "17:00", break_minutes: 0, ...o,
});

describe("shiftGrid", () => {
  it("builds Monday-Sunday weeks from any day", () => {
    const sunday = weekDates("2026-11-15");
    expect(sunday[0]).toBe("2026-11-09");
    expect(sunday[6]).toBe("2026-11-15");
    expect(weekDates("2026-11-09")).toEqual(sunday);
  });
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekDates("2026-12-30")[0]).toBe("2026-12-28");
  });
  it("lists the days of a month", () => {
    expect(monthDates(2028, 2)).toHaveLength(29);
    expect(monthDates(2026, 11)[29]).toBe("2026-11-30");
  });
  it("formats planned hours", () => {
    expect(formatPlannedHours(0)).toBe("0h");
    expect(formatPlannedHours(480)).toBe("8h");
    expect(formatPlannedHours(2310)).toBe("38h 30m");
  });
  it("detects overnight shifts", () => {
    expect(isOvernight(shift({ start_time: "22:00", end_time: "06:00" }))).toBe(true);
    expect(isOvernight(shift({}))).toBe(false);
  });
  it("renders cell text for typed, custom, split and overnight shifts", () => {
    expect(cellText([])).toBe("");
    expect(cellText([shift({ short_code: "M" })])).toBe("M");
    expect(cellText([shift({})])).toBe("09:00-17:00");
    expect(cellText([shift({ short_code: "M" }), shift({ short_code: "T" })])).toBe("M / T");
    expect(cellText([shift({ short_code: "N", start_time: "22:00", end_time: "06:00" })])).toBe("N+1");
  });
});
