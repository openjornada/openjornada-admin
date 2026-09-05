"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setActiveLocale } from "@/i18n/active-locale";
import { negotiateLocale, readLocaleCookie, writeLocaleCookie } from "@/i18n/config";
import { decideLocaleSync } from "@/i18n/sync";

/**
 * Keeps the locale sources aligned (no locale segment in the URL):
 *
 * 1. Mirrors the React locale into the active-locale store used by the axios
 *    error handler and the date formatters (non-React consumers).
 * 2. Applies the user's persisted preference (APIUser.language) once the
 *    profile is loaded: if it differs from the rendered locale, writes the
 *    NEXT_LOCALE mirror cookie and refreshes so SSR renders in it from then on.
 * 3. For a session without an explicit preference, an EXISTING cookie is never
 *    touched: it is authoritative for SSR (it may be an explicit pre-login
 *    choice made with the login-page LanguageSelector scope="cookie"), and
 *    navigator.language is not a reliable proxy for what SSR negotiated from
 *    the Accept-Language header. Only when the cookie is absent does the
 *    client write one: silently when browser negotiation matches the rendered
 *    locale (so the next SSR pass resolves from the cookie), or as a switch
 *    target (cookie write + refresh) when they disagree.
 *
 * Invariant (see decideLocaleSync): the cookie is only ever written with a
 * value that the next SSR pass will render anyway — a write that disagrees
 * with the rendered locale flips the UI language on the next navigation.
 */
export default function LocaleSync() {
  const { user, loading } = useAuth();
  const locale = useLocale();
  const router = useRouter();

  // (1) Always keep the non-React consumers in sync with what is rendered.
  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (loading) return;

    const action = decideLocaleSync({
      userLanguage: user?.language,
      signedIn: !!user,
      cookie: readLocaleCookie(),
      negotiated: negotiateLocale(
        typeof navigator !== "undefined" ? navigator.language : null
      ),
      rendered: locale,
    });

    if (action.kind === "mirror") {
      writeLocaleCookie(action.value);
    } else if (action.kind === "switch") {
      writeLocaleCookie(action.value);
      router.refresh();
    }
  }, [user, loading, locale, router]);

  return null;
}
