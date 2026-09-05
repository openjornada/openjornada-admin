import { describe, it, expect, beforeEach } from "vitest";
import { getApiErrorMessage, translateErrorCode } from "./error-messages";
import { setActiveLocale } from "@/i18n/active-locale";

function axiosLike(detail: unknown) {
  return Object.assign(new Error("Request failed"), {
    isAxiosError: true,
    response: { status: 400, data: { detail } },
  });
}

beforeEach(() => setActiveLocale("es"));

describe("translateErrorCode", () => {
  it("translates a known code in the active locale", () => {
    setActiveLocale("en");
    expect(translateErrorCode("auth.invalid_credentials")).toBe(
      "Incorrect email or password."
    );
    setActiveLocale("ca");
    expect(translateErrorCode("company.name_taken")).toBe(
      "Ja existeix una empresa amb aquest nom."
    );
  });

  it("falls back to the es catalog for a locale missing the key", () => {
    // All three catalogs currently have every code; unknown codes return undefined.
    expect(translateErrorCode("does.not_exist")).toBeUndefined();
  });
});

describe("getApiErrorMessage", () => {
  it("prefers the catalog translation for a known error_code", () => {
    setActiveLocale("en");
    const err = axiosLike({
      error_code: "worker.email_taken",
      message: "El email ya está registrado por otro trabajador.",
    });
    expect(getApiErrorMessage(err)).toBe(
      "The email is already registered by another worker."
    );
  });

  it("uses the server message for an unknown error_code", () => {
    const err = axiosLike({ error_code: "brand.new_code", message: "Texto del servidor" });
    expect(getApiErrorMessage(err)).toBe("Texto del servidor");
  });

  it("shows plain-string detail as-is (non-migrated endpoints)", () => {
    const err = axiosLike("Detail plano heredado");
    expect(getApiErrorMessage(err)).toBe("Detail plano heredado");
  });

  it("joins FastAPI 422 validation lists", () => {
    const err = axiosLike([{ msg: "field required" }, { msg: "too short" }]);
    expect(getApiErrorMessage(err)).toBe("field required; too short");
  });

  it("uses the provided fallback when the payload has nothing usable", () => {
    expect(getApiErrorMessage(axiosLike(undefined), "fallback local")).toBe("fallback local");
  });

  it("returns a generic network message without a response", () => {
    setActiveLocale("en");
    const err = Object.assign(new Error("Network Error"), { isAxiosError: true });
    expect(getApiErrorMessage(err)).toContain("Could not connect");
  });
});
