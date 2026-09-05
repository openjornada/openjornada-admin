/**
 * Recursive merge used for per-key locale fallback: the active locale's
 * messages are merged ON TOP of the fallback ("es") catalog, so a missing
 * key resolves to its Spanish text instead of breaking the screen.
 * (Recommended approach in next-intl docs; `getMessageFallback` only
 * customizes the error output, it is not a locale fallback mechanism.)
 */

type Messages = Record<string, unknown>;

function isPlainObject(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMerge(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = result[key];
    result[key] =
      isPlainObject(existing) && isPlainObject(value)
        ? deepMerge(existing, value)
        : value;
  }
  return result;
}
