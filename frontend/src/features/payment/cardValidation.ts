/**
 * Card rules. Card data must be fake but follow the real structure:
 * a valid brand prefix, the right length and a valid Luhn check digit.
 * Only VISA and MasterCard are accepted (same as the backend).
 */
export type CardBrand = 'VISA' | 'MASTERCARD';

export const onlyDigits = (value: string) => value.replace(/\D/g, '');

/** VISA starts with 4; MasterCard with 51–55 or 2221–2720. */
export const detectCardBrand = (cardNumber: string): CardBrand | null => {
  const digits = onlyDigits(cardNumber);
  if (/^4/.test(digits)) return 'VISA';
  if (/^5[1-5]/.test(digits)) return 'MASTERCARD';
  const firstFour = Number(digits.slice(0, 4));
  if (digits.length >= 4 && firstFour >= 2221 && firstFour <= 2720) {
    return 'MASTERCARD';
  }
  return null;
};

const VALID_LENGTHS: Record<CardBrand, number[]> = {
  VISA: [13, 16, 19],
  MASTERCARD: [16],
};

/** Luhn (mod 10): catches typos and made-up numbers. */
export const passesLuhn = (cardNumber: string): boolean => {
  const digits = onlyDigits(cardNumber);
  if (digits.length === 0) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

/** "4242424242424242" → "4242 4242 4242 4242" (max 19 digits). */
export const formatCardNumber = (value: string) =>
  onlyDigits(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

/** "1229" → "12/29" while typing. */
export const formatExpiry = (value: string) => {
  const digits = onlyDigits(value).slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
};

export const parseExpiry = (value: string) => {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return null;
  return { month: match[1], year: match[2] };
};

export const validateCardNumber = (value: string): string | null => {
  const digits = onlyDigits(value);
  if (!digits) return 'Ingresa el número de la tarjeta';
  const brand = detectCardBrand(digits);
  if (!brand) return 'Solo aceptamos tarjetas VISA o MasterCard';
  if (!VALID_LENGTHS[brand].includes(digits.length)) {
    return 'El número de la tarjeta está incompleto';
  }
  if (!passesLuhn(digits)) return 'El número de la tarjeta no es válido';
  return null;
};

export const validateCardHolder = (value: string): string | null => {
  const name = value.trim();
  if (!name) return 'Ingresa el nombre como aparece en la tarjeta';
  if (name.length < 5) return 'El nombre debe tener al menos 5 caracteres';
  if (name.length > 60) return 'El nombre es demasiado largo';
  if (!/^[\p{L} '.-]+$/u.test(name)) return 'El nombre solo puede tener letras';
  return null;
};

const MAX_YEARS_AHEAD = 15;

/** The card is valid until the last day of its expiry month. */
export const validateExpiry = (
  value: string,
  now = new Date(),
): string | null => {
  if (!value) return 'Ingresa la fecha de vencimiento';
  const parsed = parseExpiry(value);
  if (!parsed) return 'Usa el formato MM/AA';
  const month = Number(parsed.month);
  if (month < 1 || month > 12) return 'El mes no es válido';
  const year = 2000 + Number(parsed.year);
  const firstDayAfterExpiry = new Date(year, month, 1);
  if (firstDayAfterExpiry <= now) return 'La tarjeta está vencida';
  if (year > now.getFullYear() + MAX_YEARS_AHEAD) {
    return 'La fecha de vencimiento no es válida';
  }
  return null;
};

/** VISA and MasterCard use a 3-digit CVC. */
export const validateCvc = (value: string): string | null => {
  if (!value) return 'Ingresa el código de seguridad';
  if (!/^\d{3}$/.test(value)) return 'El código debe tener 3 dígitos';
  return null;
};
