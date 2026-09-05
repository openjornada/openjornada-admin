/**
 * Shared SMS utility functions.
 */

import { activeIntlLocale } from "@/i18n/active-locale";

/**
 * Format an ISO date string for display in the active UI locale
 * (defaults to es-ES behavior when no locale has been applied yet).
 */
export function formatSmsDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(activeIntlLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Mask a phone number for display, showing only the last 4 digits.
 * Example: "+34612345678" => "••••••• 5678"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return "••••";
  const last4 = phone.slice(-4);
  return `••••••• ${last4}`;
}
