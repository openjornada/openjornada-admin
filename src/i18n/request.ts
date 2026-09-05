/**
 * next-intl request configuration (App Router, NO locale segment in the URL).
 *
 * Locale resolution chain (per the i18n design):
 *   NEXT_LOCALE cookie (mirror of APIUser.language, written by the client)
 *   → Accept-Language browser detection (if supported)
 *   → "es".
 *
 * Per-key fallback: the requested locale's messages are deep-merged on top of
 * the "es" catalog, so a missing key resolves to its Spanish text instead of
 * breaking the screen (recommended mechanism in next-intl docs; the
 * `getMessageFallback` option is only for error output, not locale fallback).
 */
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE,
  defaultLocale,
  isSupportedLocale,
  negotiateLocale,
  type Locale,
} from "./config";
import { deepMerge } from "./merge";

type Messages = Record<string, unknown>;

export default getRequestConfig(async () => {
  let locale: string | null = null;
  try {
    const store = await cookies();
    locale = store.get(LOCALE_COOKIE)?.value ?? null;
    if (!isSupportedLocale(locale)) {
      const hdrs = await headers();
      locale = negotiateLocale(hdrs.get("accept-language"));
    }
  } catch {
    // Static prerender without request store: fall back to default.
    locale = defaultLocale;
  }

  const active: Locale = isSupportedLocale(locale) ? locale : defaultLocale;

  const esMessages = (await import(`../../messages/${defaultLocale}.json`)).default as Messages;
  const messages =
    active === defaultLocale
      ? esMessages
      : deepMerge(
          esMessages,
          (await import(`../../messages/${active}.json`)).default as Messages
        );

  return { locale: active, messages };
});
