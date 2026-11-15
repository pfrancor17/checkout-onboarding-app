import {
  type CustomerForm,
  type DeliveryForm,
  validateCustomer,
  validateDelivery,
} from './deliveryValidation';

const customer: CustomerForm = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '300 123 4567',
};

const delivery: DeliveryForm = {
  addressLine1: 'Calle 10 # 20-30',
  addressLine2: '',
  city: 'Medellín',
  region: 'Antioquia',
  postalCode: '',
};

describe('validateCustomer', () => {
  it('accepts valid data (phone with spaces)', () => {
    expect(validateCustomer(customer)).toEqual({});
  });

  it('requires every field', () => {
    expect(validateCustomer({ fullName: ' ', email: '', phone: '' })).toEqual({
      fullName: 'Ingresa tu nombre completo',
      email: 'Ingresa tu correo electrónico',
      phone: 'Ingresa tu celular',
    });
  });

  it.each([
    [{ fullName: 'Al' }, 'fullName', 'Debe tener al menos 3 caracteres'],
    [
      { fullName: 'A'.repeat(121) },
      'fullName',
      'Debe tener máximo 120 caracteres',
    ],
    [{ email: 'jane@' }, 'email', 'El correo no es válido'],
    [{ email: 'jane@example.c' }, 'email', 'El correo no es válido'],
    [{ phone: '123' }, 'phone', 'Debe tener entre 7 y 15 dígitos'],
    [{ phone: '300abc4567' }, 'phone', 'Debe tener entre 7 y 15 dígitos'],
  ])('%o → %s: %s', (override, field, message) => {
    expect(validateCustomer({ ...customer, ...override })).toEqual({
      [field]: message,
    });
  });
});

describe('validateDelivery', () => {
  it('accepts valid data without the optional fields', () => {
    expect(validateDelivery(delivery)).toEqual({});
  });

  it('requires address, city and department', () => {
    expect(
      validateDelivery({ ...delivery, addressLine1: '', city: '', region: '' }),
    ).toEqual({
      addressLine1: 'Ingresa la dirección',
      city: 'Ingresa la ciudad',
      region: 'Ingresa el departamento',
    });
  });

  it.each([
    [
      { addressLine1: 'Cl 1' },
      'addressLine1',
      'Debe tener al menos 5 caracteres',
    ],
    [
      { addressLine2: 'x'.repeat(201) },
      'addressLine2',
      'Debe tener máximo 200 caracteres',
    ],
    [{ city: 'M' }, 'city', 'Debe tener al menos 2 caracteres'],
    [{ region: 'x'.repeat(81) }, 'region', 'Debe tener máximo 80 caracteres'],
    [{ postalCode: '0500' }, 'postalCode', 'Debe tener 6 dígitos'],
  ])('%o → %s: %s', (override, field, message) => {
    expect(validateDelivery({ ...delivery, ...override })).toEqual({
      [field]: message,
    });
  });

  it('accepts a 6-digit postal code', () => {
    expect(validateDelivery({ ...delivery, postalCode: '050021' })).toEqual({});
  });
});
