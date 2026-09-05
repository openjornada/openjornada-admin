import { describe, it, expect } from "vitest";
import es from "../../messages/es.json";
import en from "../../messages/en.json";
import ca from "../../messages/ca.json";

/**
 * Catalog parity guard: request.ts deep-merges each locale on top of "es", so
 * a key missing from en/ca silently falls back to Spanish. Keeping the key
 * sets identical is therefore a hard requirement, not a nicety.
 */
function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.entries(obj).flatMap(([key, value]) =>
      flattenKeys(value, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [prefix];
}

describe("message catalog parity (es / en / ca)", () => {
  const esKeys = new Set(flattenKeys(es));

  for (const [locale, catalog] of [
    ["en", en],
    ["ca", ca],
  ] as const) {
    it(`${locale} defines exactly the same keys as es`, () => {
      const keys = new Set(flattenKeys(catalog));
      expect([...esKeys].filter((k) => !keys.has(k))).toEqual([]); // missing
      expect([...keys].filter((k) => !esKeys.has(k))).toEqual([]); // extra
    });
  }
});
