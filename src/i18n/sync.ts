/**
 * Pure decision logic for LocaleSync, kept out of the component so it can be
 * unit-tested without React/router mocks.
 *
 * Invariant: the NEXT_LOCALE cookie is only ever written with a value that the
 * NEXT SSR pass would render anyway — or together with a router.refresh() that
 * re-renders under the new value. A cookie write that disagrees with the
 * rendered locale makes the following navigation silently flip the UI language.
 */
import { isSupportedLocale, type Locale } from "./config";

export type LocaleSyncAction =
  /** Do nothing (leave cookie and render as they are). */
  | { kind: "none" }
  /** Write the cookie silently: SSR already rendered this exact locale. */
  | { kind: "mirror"; value: Locale }
  /** Write the cookie AND refresh: the rendered locale must change. */
  | { kind: "switch"; value: Locale };

export interface LocaleSyncInput {
  /** APIUser.language of the logged-in user (null/undefined = no explicit preference). */
  userLanguage: string | null | undefined;
  /** True when there is a logged-in user. */
  signedIn: boolean;
  /** NEXT_LOCALE cookie currently present in the browser (null when absent). */
  cookie: Locale | null;
  /** Locale the browser's navigator.language negotiates to. */
  negotiated: Locale;
  /** Locale the server actually rendered (useLocale()). */
  rendered: string;
}

export function decideLocaleSync(input: LocaleSyncInput): LocaleSyncAction {
  const { userLanguage, signedIn, cookie, negotiated, rendered } = input;

  if (userLanguage && isSupportedLocale(userLanguage)) {
    // Explicit persisted preference wins: switch only if the render disagrees.
    return userLanguage !== rendered ? { kind: "switch", value: userLanguage } : { kind: "none" };
  }

  if (!signedIn) return { kind: "none" };

  if (cookie) {
    // No explicit preference but a cookie exists: it is authoritative. It may
    // be an explicit pre-login choice (login-page LanguageSelector scope="cookie")
    // or a previous mirror; SSR renders consistently from it, so leave it alone.
    // navigator.language is NOT a reliable proxy for what SSR negotiated from
    // the Accept-Language header — overwriting here causes a flip on the next
    // navigation.
    return { kind: "none" };
  }

  if (negotiated !== rendered) {
    // No cookie and SSR's Accept-Language negotiation disagreed with the
    // browser's navigator.language: converge on the browser value via the
    // same cookie-write + refresh path used for explicit preferences.
    return { kind: "switch", value: negotiated };
  }

  // No cookie and both sides agree with what was rendered: mirror it silently
  // so the next SSR pass resolves from the cookie instead of the header.
  return { kind: "mirror", value: negotiated };
}
