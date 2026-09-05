import { describe, it, expect } from "vitest";
import { decideLocaleSync } from "./sync";

describe("decideLocaleSync (LocaleSync decision logic)", () => {
  const base = {
    userLanguage: null,
    signedIn: true,
    cookie: null,
    negotiated: "es",
    rendered: "es",
  } as const;

  describe("explicit preference (APIUser.language)", () => {
    it("switches to the preference when the render disagrees", () => {
      expect(
        decideLocaleSync({ ...base, userLanguage: "en", rendered: "es" })
      ).toEqual({ kind: "switch", value: "en" });
    });

    it("does nothing when the render already matches", () => {
      expect(
        decideLocaleSync({ ...base, userLanguage: "en", rendered: "en" })
      ).toEqual({ kind: "none" });
    });

    it("ignores an unsupported preference and falls through to the cookie rules", () => {
      expect(
        decideLocaleSync({ ...base, userLanguage: "fr", cookie: "ca", negotiated: "es" })
      ).toEqual({ kind: "none" });
    });
  });

  describe("no explicit preference, signed in", () => {
    it("leaves an existing cookie alone even when browser negotiation differs", () => {
      // The cookie may be an explicit pre-login choice (LanguageSelector
      // scope="cookie"); navigator.language is not a reliable proxy for the
      // Accept-Language header SSR used, so overwriting would flip the locale
      // on the next navigation.
      expect(
        decideLocaleSync({ ...base, cookie: "en", negotiated: "es", rendered: "en" })
      ).toEqual({ kind: "none" });
    });

    it("leaves an existing cookie alone when it matches negotiation", () => {
      expect(
        decideLocaleSync({ ...base, cookie: "es", negotiated: "es" })
      ).toEqual({ kind: "none" });
    });

    it("mirrors silently when there is no cookie and negotiation matches the render", () => {
      expect(
        decideLocaleSync({ ...base, negotiated: "es", rendered: "es" })
      ).toEqual({ kind: "mirror", value: "es" });
    });

    it("switches when there is no cookie and negotiation disagrees with the render", () => {
      // SSR used Accept-Language, navigator.language says otherwise: converge
      // via cookie write + refresh instead of silently writing a value that
      // does not match what was rendered.
      expect(
        decideLocaleSync({ ...base, negotiated: "es", rendered: "en" })
      ).toEqual({ kind: "switch", value: "es" });
    });
  });

  describe("signed out", () => {
    it("does nothing regardless of cookie/negotiation", () => {
      expect(
        decideLocaleSync({ ...base, signedIn: false, cookie: "en", negotiated: "es" })
      ).toEqual({ kind: "none" });
    });
  });
});
