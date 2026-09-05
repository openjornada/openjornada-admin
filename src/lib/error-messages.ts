/**
 * API error translation (capability `api-error-codes` contract).
 *
 * The API returns user-facing errors as `detail: { error_code, message }`.
 * This module maps `error_code` to the active UI locale using the same
 * message catalogs as next-intl (`errors.<domain>.<code>`), with the chain:
 *
 *   catalog[activeLocale][error_code] → catalog["es"][error_code] (per-key
 *   fallback) → server `detail.message` → plain-string `detail` (non-migrated
 *   endpoints) → generic network message.
 *
 * Works OUTSIDE React (axios interceptor + page catch blocks) via the
 * active-locale store kept in sync by <LocaleSync />.
 */
import type { AxiosError } from "axios";
import { getActiveLocale } from "@/i18n/active-locale";
import type { Locale } from "@/i18n/config";
import esMessages from "../../messages/es.json";
import enMessages from "../../messages/en.json";
import caMessages from "../../messages/ca.json";

type Messages = Record<string, unknown>;

const CATALOGS: Record<Locale, Messages> = {
  es: esMessages as unknown as Messages,
  en: enMessages as unknown as Messages,
  ca: caMessages as unknown as Messages,
};

/** Walk a nested catalog by key path; returns undefined when missing. */
function lookup(catalog: Messages, path: string[]): string | undefined {
  let current: unknown = catalog;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Messages)[key];
  }
  return typeof current === "string" ? current : undefined;
}

/** Translate a stable `error_code` (e.g. "auth.invalid_credentials"). */
export function translateErrorCode(errorCode: string, locale?: Locale): string | undefined {
  const path = ["errors", ...errorCode.split(".")];
  return lookup(CATALOGS[locale ?? getActiveLocale()], path) ?? lookup(CATALOGS.es, path);
}

interface ErrorBody {
  detail?: unknown;
}

/**
 * User-facing message for any thrown error (typically an AxiosError).
 * Handles both the migrated `{ error_code, message }` detail objects and the
 * legacy plain-string `detail`, plus FastAPI 422 validation lists.
 */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const data = (error as AxiosError<ErrorBody>)?.response?.data;
  const detail = data?.detail;

  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const { error_code: code, message } = detail as { error_code?: unknown; message?: unknown };
    if (typeof code === "string" && code) {
      const translated = translateErrorCode(code);
      if (translated) return translated;
    }
    if (typeof message === "string" && message) return message;
  } else if (typeof detail === "string" && detail) {
    // Non-migrated endpoint: show the server text as-is (back-compat).
    return detail;
  } else if (Array.isArray(detail) && detail.length > 0) {
    // FastAPI 422 validation errors: join the individual messages.
    const joined = detail
      .map((e) => (e && typeof e === "object" ? (e as { msg?: string }).msg : undefined))
      .filter(Boolean)
      .join("; ");
    if (joined) return joined;
  }

  if (fallback) return fallback;

  // No response at all (network/CORS) vs. unexpected status without detail.
  const isNetworkError =
    error instanceof Object && "isAxiosError" in error && !(error as AxiosError).response;
  return lookup(CATALOGS[getActiveLocale()], ["errors", "network", isNetworkError ? "generic" : "unexpected"])!;
}
