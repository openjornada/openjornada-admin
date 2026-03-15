import { describe, it, expect } from "vitest";
import {
  formatForDatetimeLocalInput,
  datetimeLocalToUTC,
  formatMinutesToHoursMinutes,
  formatToLocalTime,
  formatToLocalTimeShort,
  getMonthName,
  getBrowserTimezone,
} from "./dateFormatters";

// ---------------------------------------------------------------------------
// formatForDatetimeLocalInput
// ---------------------------------------------------------------------------
describe("formatForDatetimeLocalInput", () => {
  it("returns empty string for null", () => {
    expect(formatForDatetimeLocalInput(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatForDatetimeLocalInput(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatForDatetimeLocalInput("")).toBe("");
  });

  it("returns a string in YYYY-MM-DDTHH:mm format for a valid UTC ISO string", () => {
    const result = formatForDatetimeLocalInput("2025-06-15T10:30:00.000Z");
    // Must match the datetime-local input format regardless of the runner timezone
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("preserves the correct date components relative to the local timezone", () => {
    // Use a fixed point in time and reconstruct the expected local string
    const utcStr = "2025-06-15T10:30:00.000Z";
    const date = new Date(utcStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const expected = `${year}-${month}-${day}T${hours}:${minutes}`;

    expect(formatForDatetimeLocalInput(utcStr)).toBe(expected);
  });

  it("handles a UTC string that has no sub-second component", () => {
    const result = formatForDatetimeLocalInput("2025-01-01T00:00:00Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// datetimeLocalToUTC
// ---------------------------------------------------------------------------
describe("datetimeLocalToUTC", () => {
  it("returns empty string for null", () => {
    expect(datetimeLocalToUTC(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(datetimeLocalToUTC(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(datetimeLocalToUTC("")).toBe("");
  });

  it("returns empty string for a completely invalid string", () => {
    expect(datetimeLocalToUTC("not-a-date")).toBe("");
  });

  it("returns a valid ISO UTC string for a valid local datetime string", () => {
    // new Date("2025-06-15T10:30") interprets as local time
    const result = datetimeLocalToUTC("2025-06-15T10:30");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("normalizes a space-separated datetime (no T) to use T", () => {
    const result = datetimeLocalToUTC("2025-06-15 10:30");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("roundtrip: datetimeLocalToUTC(formatForDatetimeLocalInput(utc)) is within 60 seconds of original", () => {
    const original = "2025-06-15T14:00:00.000Z";
    const local = formatForDatetimeLocalInput(original);
    const backToUtc = datetimeLocalToUTC(local);

    const originalMs = new Date(original).getTime();
    const roundtripMs = new Date(backToUtc).getTime();

    // The roundtrip loses seconds/milliseconds (datetime-local has minute precision)
    // so the difference must be less than 60 seconds
    expect(Math.abs(originalMs - roundtripMs)).toBeLessThan(60_000);
  });
});

// ---------------------------------------------------------------------------
// formatMinutesToHoursMinutes
// NOTE: The actual format uses "h" and "m" (not "min"), e.g. "1h 30m"
// The zero/negative guard returns "0h 0m"
// ---------------------------------------------------------------------------
describe("formatMinutesToHoursMinutes", () => {
  it("returns '0h 0m' for 0 minutes", () => {
    expect(formatMinutesToHoursMinutes(0)).toBe("0h 0m");
  });

  it("returns '0h 0m' for negative values", () => {
    expect(formatMinutesToHoursMinutes(-5)).toBe("0h 0m");
  });

  it("returns '0h 59m' for 59 minutes", () => {
    expect(formatMinutesToHoursMinutes(59)).toBe("0h 59m");
  });

  it("returns '1h 0m' for exactly 60 minutes", () => {
    expect(formatMinutesToHoursMinutes(60)).toBe("1h 0m");
  });

  it("returns '1h 30m' for 90 minutes", () => {
    expect(formatMinutesToHoursMinutes(90)).toBe("1h 30m");
  });

  it("returns '23h 59m' for 1439 minutes", () => {
    expect(formatMinutesToHoursMinutes(1439)).toBe("23h 59m");
  });

  it("rounds fractional minutes with Math.round", () => {
    // 90.5 minutes → 1h and Math.round(30.5) = 31m (rounds up 0.5)
    // But first confirm: Math.round(90.5 % 60) = Math.round(30.5) = 31
    expect(formatMinutesToHoursMinutes(90.5)).toBe("1h 31m");
  });

  it("returns '0h 1m' for 1 minute", () => {
    expect(formatMinutesToHoursMinutes(1)).toBe("0h 1m");
  });
});

// ---------------------------------------------------------------------------
// formatToLocalTime
// ---------------------------------------------------------------------------
describe("formatToLocalTime", () => {
  it("returns empty string for null", () => {
    expect(formatToLocalTime(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatToLocalTime(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatToLocalTime("")).toBe("");
  });

  it("returns a non-empty string for a valid ISO UTC string", () => {
    const result = formatToLocalTime("2025-06-15T10:30:00.000Z");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains a 4-digit year for a valid date", () => {
    const result = formatToLocalTime("2025-06-15T10:30:00.000Z");
    expect(result).toContain("2025");
  });

  it("accepts custom Intl.DateTimeFormatOptions", () => {
    const result = formatToLocalTime("2025-06-15T10:30:00.000Z", {
      year: "numeric",
      month: "long",
    });
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// formatToLocalTimeShort
// ---------------------------------------------------------------------------
describe("formatToLocalTimeShort", () => {
  it("returns empty string for null", () => {
    expect(formatToLocalTimeShort(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatToLocalTimeShort(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatToLocalTimeShort("")).toBe("");
  });

  it("returns a non-empty string for a valid ISO UTC string", () => {
    const result = formatToLocalTimeShort("2025-06-15T10:30:00.000Z");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a string that matches HH:MM pattern (24h or similar)", () => {
    // es-ES locale with hour/minute only
    const result = formatToLocalTimeShort("2025-06-15T10:30:00.000Z");
    // The output is locale-dependent but should contain digits and a colon
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

// ---------------------------------------------------------------------------
// getMonthName
// ---------------------------------------------------------------------------
describe("getMonthName", () => {
  const spanishMonths = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  it.each(spanishMonths.map((name, i) => [i + 1, name] as [number, string]))(
    "returns '%s' for month %i",
    (month, expected) => {
      expect(getMonthName(month)).toBe(expected);
    }
  );

  it("returns empty string for month 0 (out of bounds below)", () => {
    // MONTH_NAMES_ES[0 - 1] = MONTH_NAMES_ES[-1] = undefined → fallback ""
    expect(getMonthName(0)).toBe("");
  });

  it("returns empty string for month 13 (out of bounds above)", () => {
    expect(getMonthName(13)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// getBrowserTimezone
// ---------------------------------------------------------------------------
describe("getBrowserTimezone", () => {
  it("returns a non-empty string", () => {
    const tz = getBrowserTimezone();
    expect(typeof tz).toBe("string");
    expect(tz.length).toBeGreaterThan(0);
  });

  it("returns a string that looks like a valid IANA timezone (contains slash or is UTC)", () => {
    const tz = getBrowserTimezone();
    // Valid IANA zones contain a slash (e.g., "Europe/Madrid") or are "UTC"
    expect(tz === "UTC" || tz.includes("/")).toBe(true);
  });
});
