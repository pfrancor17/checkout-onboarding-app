const formatters = new Map<string, Intl.NumberFormat>();

/**
 * Formats an amount in cents for display: 24990000 COP → "$ 249.900".
 * The API always works in cents (integers) to avoid rounding errors.
 */
export const formatMoney = (amountInCents: number, currency = 'COP') => {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
    formatters.set(currency, formatter);
  }
  return formatter.format(amountInCents / 100);
};
