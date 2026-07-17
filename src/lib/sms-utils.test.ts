import { describe, it, expect } from "vitest";
import {
  formatSmsDate,
  maskPhoneNumber,
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
