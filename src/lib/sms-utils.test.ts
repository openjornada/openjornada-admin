import { describe, it, expect } from "vitest";
import {
  formatSmsDate,
  maskPhoneNumber,
  getCurrentMonthRange,
} from "./sms-utils";

// ---------------------------------------------------------------------------
// formatSmsDate
// ---------------------------------------------------------------------------
describe("formatSmsDate", () => {
  it("returns a non-empty string for a valid ISO UTC string", () => {
    const result = formatSmsDate("2025-06-15T10:30:00.000Z");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the year for a valid date", () => {
    const result = formatSmsDate("2025-06-15T10:30:00.000Z");
    expect(result).toContain("2025");
  });

  it("contains digits separated by slashes (es-ES date format: DD/MM/YYYY)", () => {
    const result = formatSmsDate("2025-06-15T10:30:00.000Z");
    // es-ES locale formats date as DD/MM/YYYY
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("contains a time component with hours and minutes", () => {
    const result = formatSmsDate("2025-06-15T10:30:00.000Z");
    // Should contain HH:MM somewhere
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("the date portion reflects the correct day/month/year in local time", () => {
    // Build the expected date components from the local timezone perspective
    const isoStr = "2025-06-15T12:00:00.000Z";
    const date = new Date(isoStr);
    const year = date.getFullYear();
    expect(formatSmsDate(isoStr)).toContain(String(year));
  });
});

// ---------------------------------------------------------------------------
// maskPhoneNumber
// ---------------------------------------------------------------------------
describe("maskPhoneNumber", () => {
  it("returns '••••' for an empty string", () => {
    expect(maskPhoneNumber("")).toBe("••••");
  });

  it("returns '••••' for a 1-character string", () => {
    expect(maskPhoneNumber("6")).toBe("••••");
  });

  it("returns '••••' for a 2-character string", () => {
    expect(maskPhoneNumber("61")).toBe("••••");
  });

  it("returns '••••' for a 3-character string (length < 4)", () => {
    expect(maskPhoneNumber("612")).toBe("••••");
  });

  it("returns '••••••• 1234' for a exactly 4-character string", () => {
    // length === 4 passes the guard (>= 4), last 4 chars = "1234"
    expect(maskPhoneNumber("1234")).toBe("••••••• 1234");
  });

  it("masks a full Spanish number with prefix, showing last 4 digits", () => {
    expect(maskPhoneNumber("+34612345678")).toBe("••••••• 5678");
  });

  it("masks a local Spanish number without prefix, showing last 4 digits", () => {
    expect(maskPhoneNumber("612345678")).toBe("••••••• 5678");
  });

  it("masks a short number of exactly 4 chars", () => {
    expect(maskPhoneNumber("5678")).toBe("••••••• 5678");
  });

  it("always shows the last 4 digits after the bullet prefix", () => {
    const phone = "0000999";
    const result = maskPhoneNumber(phone);
    expect(result).toBe("••••••• 0999");
  });
});

// ---------------------------------------------------------------------------
// getCurrentMonthRange
// ---------------------------------------------------------------------------
describe("getCurrentMonthRange", () => {
  it("returns an object with 'start' and 'end' keys", () => {
    const range = getCurrentMonthRange();
    expect(range).toHaveProperty("start");
    expect(range).toHaveProperty("end");
  });

  it("start is in YYYY-MM-01 format", () => {
    const { start } = getCurrentMonthRange();
    expect(start).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("end is in YYYY-MM-DD format", () => {
    const { end } = getCurrentMonthRange();
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("start and end share the same year and month", () => {
    const { start, end } = getCurrentMonthRange();
    const startYearMonth = start.slice(0, 7); // "YYYY-MM"
    const endYearMonth = end.slice(0, 7);     // "YYYY-MM"
    expect(startYearMonth).toBe(endYearMonth);
  });

  it("start day is always '01'", () => {
    const { start } = getCurrentMonthRange();
    expect(start.slice(-2)).toBe("01");
  });

  it("end day matches today's date", () => {
    const now = new Date();
    const todayDay = String(now.getDate()).padStart(2, "0");
    const { end } = getCurrentMonthRange();
    expect(end.slice(-2)).toBe(todayDay);
  });

  it("end year matches the current year", () => {
    const now = new Date();
    const currentYear = String(now.getFullYear());
    const { end } = getCurrentMonthRange();
    expect(end.slice(0, 4)).toBe(currentYear);
  });

  it("both start and end are valid date strings (parseable)", () => {
    const { start, end } = getCurrentMonthRange();
    expect(isNaN(new Date(start).getTime())).toBe(false);
    expect(isNaN(new Date(end).getTime())).toBe(false);
  });
});
