/**
 * i18n configuration for the admin panel (next-intl WITHOUT locale segments in
 * the URL). The active UI locale is a per-user preference (APIUser.language),
 * mirrored into a cookie so SSR can render in the right language immediately.
 *
 * Adding a new language = add its catalog in /messages + extend `locales`.
 */

export const locales = ["es", "en", "ca"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/**
 * Browser/Accept-Language detection: returns the first supported locale, or
 * the global fallback ("es") when nothing matches.
 * Accepts a raw navigator.language value or a full Accept-Language header.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;
  const candidates = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? parseFloat(qParam.split("=")[1]) : 1;
      return { tag: tag.trim().toLowerCase(), q: isNaN(q) ? 0 : q };
    })
    .filter((c) => c.tag && c.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    const primary = tag.split("-")[0];
    if (isSupportedLocale(primary)) return primary;
  }
  return defaultLocale;
}

/** Intl tag used for date/number formatting per supported UI locale. */
const INTL_TAGS: Record<Locale, string> = {
  es: "es-ES",
  en: "en-GB",
  ca: "ca-ES",
};

export function toIntlLocale(locale: Locale): string {
  return INTL_TAGS[locale];
}

// ---------------------------------------------------------------------------
// Cookie helpers (client-side mirror). The cookie is scoped to the app
// basePath so it is always sent with document requests and Next.js can read
// it in getRequestConfig.
// ---------------------------------------------------------------------------

function cookiePath(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return base || "/";
}

export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=${cookiePath()};max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

export function clearLocaleCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=;path=${cookiePath()};max-age=0;samesite=lax`;
}

export function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isSupportedLocale(value) ? value : null;
}
