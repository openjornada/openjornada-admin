/**
 * Shared SMS utility functions.
 */

/**
 * Format an ISO date string for display in the es-ES locale.
 */
export function formatSmsDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("es-ES", {
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

/**
 * Return the first and last days of the current month as YYYY-MM-DD strings.
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${day}`,
  };
}
