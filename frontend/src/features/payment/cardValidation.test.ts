import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  parseExpiry,
  passesLuhn,
  validateCardHolder,
  validateCardNumber,
  validateCvc,
  validateExpiry,
} from './cardValidation';

describe('detectCardBrand', () => {
  it.each([
    ['4242 4242 4242 4242', 'VISA'],
    ['4', 'VISA'],
    ['5555555555554444', 'MASTERCARD'],
    ['51', 'MASTERCARD'],
    ['2221000000000009', 'MASTERCARD'],
    ['2720999999999996', 'MASTERCARD'],
    ['2220999999999999', null],
    ['378282246310005', null], // Amex
    ['6011111111111117', null], // Discover
    ['', null],
  ])('%s → %s', (number, brand) => {
    expect(detectCardBrand(number)).toBe(brand);
  });
});

describe('passesLuhn', () => {
  it.each([
    ['4242424242424242', true],
    ['4111111111111111', true],
    ['5555555555554444', true],
    ['4242424242424241', false],
    ['', false],
  ])('%s → %s', (number, valid) => {
    expect(passesLuhn(number)).toBe(valid);
  });
});

describe('formatting', () => {
  it('groups the card number in blocks of 4, up to 19 digits', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('4242-42ab42')).toBe('4242 4242');
    expect(formatCardNumber('1'.repeat(25)).replace(/ /g, '')).toHaveLength(19);
  });

  it('formats the expiry as MM/YY while typing', () => {
    expect(formatExpiry('1')).toBe('1');
    expect(formatExpiry('12')).toBe('12');
    expect(formatExpiry('122')).toBe('12/2');
    expect(formatExpiry('12/299')).toBe('12/29');
  });

  it('parses MM/YY', () => {
    expect(parseExpiry('07/31')).toEqual({ month: '07', year: '31' });
    expect(parseExpiry('7/31')).toBeNull();
  });
});

describe('validateCardNumber', () => {
  it.each([
    ['', 'Ingresa el número de la tarjeta'],
    ['378282246310005', 'Solo aceptamos tarjetas VISA o MasterCard'],
    ['4242 4242', 'El número de la tarjeta está incompleto'],
    ['5555 5555 5555 444', 'El número de la tarjeta está incompleto'],
    ['4242 4242 4242 4241', 'El número de la tarjeta no es válido'],
  ])('%p → %s', (number, error) => {
    expect(validateCardNumber(number)).toBe(error);
  });

  it.each(['4242 4242 4242 4242', '5555 5555 5555 4444', '4222222222222'])(
    'accepts %s',
    (number) => {
      expect(validateCardNumber(number)).toBeNull();
    },
  );
});

describe('validateCardHolder', () => {
  it.each([
    ['', 'Ingresa el nombre como aparece en la tarjeta'],
    ['Ana', 'El nombre debe tener al menos 5 caracteres'],
    ['A'.repeat(61), 'El nombre es demasiado largo'],
    ['Jane Doe 3', 'El nombre solo puede tener letras'],
  ])('%p → %s', (name, error) => {
    expect(validateCardHolder(name)).toBe(error);
  });

  it('accepts names with accents and apostrophes', () => {
    expect(validateCardHolder("María José O'Neil")).toBeNull();
  });
});

describe('validateExpiry', () => {
  const now = new Date(2026, 10, 15); // 15 Nov 2026

  it.each([
    ['', 'Ingresa la fecha de vencimiento'],
    ['1229', 'Usa el formato MM/AA'],
    ['13/29', 'El mes no es válido'],
    ['00/29', 'El mes no es válido'],
    ['10/26', 'La tarjeta está vencida'],
    ['12/50', 'La fecha de vencimiento no es válida'],
  ])('%p → %s', (value, error) => {
    expect(validateExpiry(value, now)).toBe(error);
  });

  it('accepts a card that expires at the end of the current month', () => {
    expect(validateExpiry('11/26', now)).toBeNull();
    expect(validateExpiry('12/29', now)).toBeNull();
  });

  it('uses the current date by default', () => {
    expect(validateExpiry('01/20')).toBe('La tarjeta está vencida');
  });
});

describe('validateCvc', () => {
  it.each([
    ['', 'Ingresa el código de seguridad'],
    ['12', 'El código debe tener 3 dígitos'],
    ['1234', 'El código debe tener 3 dígitos'],
    ['12a', 'El código debe tener 3 dígitos'],
  ])('%p → %s', (value, error) => {
    expect(validateCvc(value)).toBe(error);
  });

  it('accepts 3 digits', () => {
    expect(validateCvc('123')).toBeNull();
  });
});
