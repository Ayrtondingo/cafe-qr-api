import { centsToDecimal, decimalToCents } from './money';

describe('money', () => {
  it('parsea Decimal como texto, sin float', () => {
    expect(decimalToCents('1234.50')).toBe(123450);
    expect(decimalToCents('0.07')).toBe(7);
    expect(decimalToCents('-15.5')).toBe(-1550);
    expect(decimalToCents('-0.50')).toBe(-50);
    expect(decimalToCents('1500')).toBe(150000);
    expect(decimalToCents({ toFixed: () => '99.99' })).toBe(9999);
  });

  it('genera Decimal como texto', () => {
    expect(centsToDecimal(123450)).toBe('1234.50');
    expect(centsToDecimal(7)).toBe('0.07');
    expect(centsToDecimal(-1550)).toBe('-15.50');
    expect(centsToDecimal(0)).toBe('0.00');
  });

  it('ida y vuelta conserva el valor exacto', () => {
    for (const cents of [0, 1, 99, 100, 150050, -50, 999999999999]) {
      expect(decimalToCents(centsToDecimal(cents))).toBe(cents);
    }
  });

  it('rechaza montos que no son centavos enteros', () => {
    expect(() => centsToDecimal(10.5)).toThrow(RangeError);
    expect(() => centsToDecimal(Number.NaN)).toThrow(RangeError);
  });
});
