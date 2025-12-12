/**
 * Utilidades para formatear y convertir fechas/horas
 *
 * ARQUITECTURA:
 * - Backend siempre guarda en UTC (ISO 8601 con "Z")
 * - Frontend convierte a zona horaria local del navegador
 * - toLocaleString() aplica automáticamente timezone del navegador
 */

/**
 * Formatea una fecha UTC a la zona horaria del navegador
 *
 * @param utcDateStr - String ISO 8601 en UTC (ej: "2025-12-05T19:20:53.531Z")
 * @param options - Opciones de formato (Intl.DateTimeFormatOptions)
 * @returns String formateado en zona horaria local
 *
 * EJEMPLO:
 * Input:  "2025-12-05T19:20:53.531Z" (UTC)
 * Output: "05/12/2025, 20:20" (si navegador está en España UTC+1)
 */
export const formatToLocalTime = (
  utcDateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!utcDateStr) return '';

  const date = new Date(utcDateStr);

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  return date.toLocaleString('es-ES', defaultOptions);
};

/**
 * Formatea una fecha UTC solo con hora:minuto
 *
 * EJEMPLO:
 * Input:  "2025-12-05T19:20:53.531Z" (UTC)
 * Output: "20:20" (si navegador está en España UTC+1)
 */
export const formatToLocalTimeShort = (
  utcDateStr: string | null | undefined
): string => {
  if (!utcDateStr) return '';

  const date = new Date(utcDateStr);

  return date.toLocaleString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formatea para input type="datetime-local" (YYYY-MM-DDTHH:mm)
 * El input datetime-local siempre interpreta su valor como zona local del navegador
 *
 * @param utcDateStr - String ISO 8601 en UTC
 * @returns String en formato YYYY-MM-DDTHH:mm
 *
 * EJEMPLO:
 * Input:  "2025-12-05T19:20:53.531Z" (UTC)
 * Output: "2025-12-05T20:20" (si navegador está en España UTC+1)
 *
 * CÓMO FUNCIONA:
 * 1. Parse de UTC: new Date("2025-12-05T19:20:53.531Z")
 * 2. getHours() devuelve horas en zona LOCAL del navegador
 * 3. Resultado: getHours() = 20 (porque es UTC+1 en España)
 */
export const formatForDatetimeLocalInput = (
  utcDateStr: string | null | undefined
): string => {
  if (!utcDateStr) return '';

  const date = new Date(utcDateStr);

  // getFullYear(), getMonth(), getDate(), getHours(), getMinutes()
  // siempre devuelven valores en zona local del navegador
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Convierte un valor datetime-local (zona local) a UTC ISO string
 *
 * @param localDatetimeStr - String en formato YYYY-MM-DDTHH:mm (zona local)
 * @returns String ISO 8601 en UTC (con "Z")
 *
 * EJEMPLO:
 * Input:  "2025-12-05T20:20" (zona local, navegador en España UTC+1)
 * Output: "2025-12-05T19:20:00.000Z" (UTC)
 *
 * CÓMO FUNCIONA:
 * 1. new Date("2025-12-05T20:20") interpreta como zona LOCAL
 * 2. toISOString() convierte a UTC
 * 3. Resultado: UTC correctamente convertido
 */
export const datetimeLocalToUTC = (
  localDatetimeStr: string | null | undefined
): string => {
  if (!localDatetimeStr) return '';

  // Si el string no tiene "T", intentamos agregarlo
  const normalized = localDatetimeStr.includes('T')
    ? localDatetimeStr
    : localDatetimeStr.replace(' ', 'T');

  const date = new Date(normalized);

  // Verificar que la fecha sea válida
  if (isNaN(date.getTime())) {
    console.warn(`Invalid datetime string: ${localDatetimeStr}`);
    return '';
  }

  return date.toISOString();
};

/**
 * Obtiene la zona horaria del navegador
 *
 * @returns String con zona (ej: "Europe/Madrid", "America/New_York")
 */
export const getBrowserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
