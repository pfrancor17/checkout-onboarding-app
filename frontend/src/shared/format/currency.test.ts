import { formatMoney } from './currency';

// Intl uses a non-breaking space between the symbol and the number.
const normalize = (text: string) => text.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it('formats cents as Colombian pesos without decimals', () => {
    expect(normalize(formatMoney(24_990_000))).toBe('$ 249.900');
    expect(normalize(formatMoney(35_900_000, 'COP'))).toBe('$ 359.000');
  });

  it('rounds to whole pesos', () => {
    expect(normalize(formatMoney(150))).toBe('$ 2');
  });

  it('supports other currencies (cached formatter)', () => {
    expect(formatMoney(1_000, 'USD')).toContain('10');
    expect(formatMoney(2_000, 'USD')).toContain('20');
  });
});
