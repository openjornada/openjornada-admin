/**
 * SMS encoding helpers — client-side mirror of the API's
 * `api/utils/sms_length.py` (GSM 03.38 detection + single-segment limits).
 *
 * A single SMS segment carries 160 septets when the whole message fits the
 * GSM-7 default alphabet, but only 70 characters when any character forces
 * UCS-2. GSM-7 *extension* characters (`^ { } \ [ ] ~ | €` and form feed)
 * are still GSM-7 but cost two septets each.
 *
 * Accent nuance: `à è é ì ò ù ç ñ ü` are GSM-7 basic characters, while the
 * acute tildes `á í ó ú` are NOT — a single one drops the budget to 70.
 */

const GSM7_BASIC = new Set(
  (
    "@£$¥èéùìòç\nØø\rÅÄÖÆßÉ" +
    "åΔΦΓΛΩΠΨΣΘΞ" +
    ' !"#$%&\'()*+,-./0123456789:;<=>?' +
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§" +
    "à¿abcdefghijklmnopqrstuvwxyzäöñüß" +
    "_¤"
  ).split("")
);

const GSM7_EXTENSION = new Set("\f^{}\\[]~|€".split(""));

export const GSM7_SEGMENT_SIZE = 160;
export const UCS2_SEGMENT_SIZE = 70;

/** True when every character fits the GSM-7 alphabet (basic + extension). */
export function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM7_BASIC.has(ch) && !GSM7_EXTENSION.has(ch)) return false;
  }
  return true;
}

/**
 * Max characters of `text` that still fit in a single SMS segment:
 * 160 for pure GSM-7, 70 when any UCS-2 character is present.
 */
export function smsSegmentLimit(text: string): number {
  return isGsm7(text) ? GSM7_SEGMENT_SIZE : UCS2_SEGMENT_SIZE;
}

/**
 * Effective encoded length: septet count for GSM-7 (extension chars cost 2),
 * character count for UCS-2. Compare against `smsSegmentLimit`.
 */
export function smsLength(text: string): number {
  if (!isGsm7(text)) return [...text].length;
  let n = 0;
  for (const ch of text) n += GSM7_EXTENSION.has(ch) ? 2 : 1;
  return n;
}

/** True when `text` is deliverable as exactly one SMS segment. */
export function fitsSingleSegment(text: string): boolean {
  return smsLength(text) <= smsSegmentLimit(text);
}
