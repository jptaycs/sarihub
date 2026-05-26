const pesoFormatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format integer centavos as "₱1,234.50".
 * Money is always centavos in the DB. This is the single conversion point.
 */
export function formatPeso(centavos: bigint | number): string {
  const c = typeof centavos === "bigint" ? Number(centavos) : centavos;
  const pesos = c / 100;
  return `₱${pesoFormatter.format(pesos)}`;
}

/**
 * Convert E.164 "+639171234567" to the local-display "0917 123 4567".
 * Falls back to the input unchanged if it isn't a PH mobile in E.164.
 */
export function formatPhone(e164: string): string {
  const match = /^\+63(9\d{9})$/.exec(e164);
  if (!match) return e164;
  const local = `0${match[1]}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/**
 * Parse a user-entered PH mobile to E.164. Accepts "0917...", "+63917...",
 * "63917...", and with-spaces variants. Returns null if not a valid PH mobile.
 */
export function parsePhPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let national: string | null = null;
  if (digits.startsWith("63") && digits.length === 12) national = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) national = digits.slice(1);
  else if (digits.length === 10 && digits.startsWith("9")) national = digits;
  if (!national || !/^9\d{9}$/.test(national)) return null;
  return `+63${national}`;
}
