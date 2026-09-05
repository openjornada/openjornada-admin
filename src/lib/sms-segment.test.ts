import { describe, it, expect } from "vitest";
import { isGsm7, smsLength, smsSegmentLimit, fitsSingleSegment } from "./sms-segment";

// ---------------------------------------------------------------------------
// isGsm7 — mirrors the API's api/utils/sms_length.py
// ---------------------------------------------------------------------------
describe("isGsm7", () => {
  it("accepts plain ASCII text", () => {
    expect(isGsm7("Hola, esto es una prueba 123!")).toBe(true);
  });

  it("accepts GSM-7 accented chars (à è é ì ò ù ç ñ ü)", () => {
    expect(isGsm7("Contraseña: àèéìòùçü")).toBe(true);
  });

  it("rejects acute tildes á í ó ú (force UCS-2)", () => {
    expect(isGsm7("Jornada á")).toBe(false);
    expect(isGsm7("í")).toBe(false);
    expect(isGsm7("ó")).toBe(false);
    expect(isGsm7("ú")).toBe(false);
  });

  it("rejects other non-GSM chars (e.g. emoji, Chinese)", () => {
    expect(isGsm7("hola 👋")).toBe(false);
    expect(isGsm7("你好")).toBe(false);
  });

  it("treats template markers as GSM-7 (braces are extension chars)", () => {
    expect(isGsm7("{%worker_name%}")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// smsSegmentLimit
// ---------------------------------------------------------------------------
describe("smsSegmentLimit", () => {
  it("returns 160 for pure GSM-7 text", () => {
    expect(smsSegmentLimit("Hola")).toBe(160);
  });

  it("returns 70 when any char forces UCS-2", () => {
    expect(smsSegmentLimit("Hola, estás listo")).toBe(70);
  });
});

// ---------------------------------------------------------------------------
// smsLength — extension chars cost two septets
// ---------------------------------------------------------------------------
describe("smsLength", () => {
  it("counts one septet per GSM-7 basic char", () => {
    expect(smsLength("Hola")).toBe(4);
  });

  it("counts extension chars ({ } ^ ~ [ ] \\ | € and form feed) as two", () => {
    expect(smsLength("{%tag%}")).toBe(7 + 2); // 7 basic + 2 extension braces
    expect(smsLength("^")).toBe(2);
  });

  it("counts plain chars for UCS-2 text", () => {
    expect(smsLength("ábc")).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// fitsSingleSegment
// ---------------------------------------------------------------------------
describe("fitsSingleSegment", () => {
  it("fits a 160-char GSM-7 text", () => {
    expect(fitsSingleSegment("a".repeat(160))).toBe(true);
  });

  it("does not fit a 161-char GSM-7 text", () => {
    expect(fitsSingleSegment("a".repeat(161))).toBe(false);
  });

  it("does not fit a 71-char UCS-2 text", () => {
    expect(fitsSingleSegment("á" + "a".repeat(70))).toBe(false);
  });

  it("counts extension septets against the 160 budget", () => {
    // 159 basic chars + one "^" (2 septets) = 161 septets > 160
    expect(fitsSingleSegment("a".repeat(159) + "^")).toBe(false);
  });
});
