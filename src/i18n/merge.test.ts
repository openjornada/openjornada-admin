import { describe, it, expect } from "vitest";
import { deepMerge } from "./merge";

describe("deepMerge (per-key locale fallback)", () => {
  const es = {
    nav: { workers: "Trabajadores", companies: "Empresas" },
    common: { save: "Guardar" },
    list: ["a", "b"],
  };

  it("keeps the requested-locale value when present", () => {
    const out = deepMerge(es, { nav: { workers: "Treballadors" } });
    expect((out.nav as Record<string, string>).workers).toBe("Treballadors");
  });

  it("falls back to the base (es) value for missing keys", () => {
    const out = deepMerge(es, { nav: { workers: "Treballadors" } });
    expect((out.nav as Record<string, string>).companies).toBe("Empresas");
    expect((out.common as Record<string, string>).save).toBe("Guardar");
  });

  it("does not mutate the inputs", () => {
    deepMerge(es, { nav: { extra: "x" } });
    expect(es.nav).not.toHaveProperty("extra");
  });

  it("arrays and scalars are overridden wholesale", () => {
    const out = deepMerge(es, { list: ["c"] });
    expect(out.list).toEqual(["c"]);
  });

  it("merges deeply nested objects", () => {
    const out = deepMerge(
      { a: { b: { c: 1, d: 2 } } },
      { a: { b: { c: 9 } } }
    ) as { a: { b: { c: number; d: number } } };
    expect(out.a.b).toEqual({ c: 9, d: 2 });
  });
});
