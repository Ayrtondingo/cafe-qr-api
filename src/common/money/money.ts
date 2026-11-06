/**
 * Dinero: en el dominio y en la API se maneja en CENTAVOS ENTEROS, nunca float
 * (0.1 + 0.2 !== 0.3). En la base: Decimal(14,2). La conversión vive solo en los
 * repositories (ADR 0001).
 */
export type Centavos = number;

/** "1234.50" (Decimal de la base) → 123450. Parseo de texto: sin pasar por float. */
export function decimalToCents(value: { toFixed(digits: number): string } | string): Centavos {
  const text = typeof value === 'string' ? value : value.toFixed(2);
  const negative = text.startsWith('-');
  const [integer, fraction = ''] = text.replace('-', '').split('.');
  const cents = Number(integer) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
  return negative ? -cents : cents;
}

/** 123450 → "1234.50" (para escribir en columnas Decimal sin pasar por float). */
export function centsToDecimal(cents: Centavos): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Monto inválido: ${cents} no es un entero de centavos`);
  }
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
