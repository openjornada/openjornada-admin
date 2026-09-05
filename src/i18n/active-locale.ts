/**
 * Module-level mirror of the active UI locale, usable OUTSIDE React
 * (axios error handler, date formatters). Kept in sync by <LocaleSync />.
 */
import { defaultLocale, isSupportedLocale, toIntlLocale, type Locale } from "./config";

let active: Locale = defaultLocale;

export function setActiveLocale(value: string): void {
  if (isSupportedLocale(value)) active = value;
}

export function getActiveLocale(): Locale {
  return active;
}

/** Intl tag ("es-ES" | "en-GB" | "ca-ES") for the active locale. */
export function activeIntlLocale(): string {
  return toIntlLocale(active);
}
