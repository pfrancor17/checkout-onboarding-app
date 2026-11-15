/** Customer and delivery rules: the same limits as the backend DTOs. */
export interface CustomerForm {
  fullName: string;
  email: string;
  phone: string;
}

export interface DeliveryForm {
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9]{7,15}$/;
const POSTAL_CODE = /^[0-9]{6}$/;

const required = (value: string, message: string, min: number, max: number) => {
  const trimmed = value.trim();
  if (!trimmed) return message;
  if (trimmed.length < min) return `Debe tener al menos ${min} caracteres`;
  if (trimmed.length > max) return `Debe tener máximo ${max} caracteres`;
  return null;
};

export const validateCustomer = (
  form: CustomerForm,
): FieldErrors<CustomerForm> => {
  const errors: FieldErrors<CustomerForm> = {};
  const fullName = required(
    form.fullName,
    'Ingresa tu nombre completo',
    3,
    120,
  );
  if (fullName) errors.fullName = fullName;

  const email = form.email.trim();
  if (!email) errors.email = 'Ingresa tu correo electrónico';
  else if (!EMAIL.test(email) || email.length > 254) {
    errors.email = 'El correo no es válido';
  }

  const phone = form.phone.replace(/[\s-]/g, '');
  if (!phone) errors.phone = 'Ingresa tu celular';
  else if (!PHONE.test(phone)) errors.phone = 'Debe tener entre 7 y 15 dígitos';
  return errors;
};

export const validateDelivery = (
  form: DeliveryForm,
): FieldErrors<DeliveryForm> => {
  const errors: FieldErrors<DeliveryForm> = {};
  const address = required(form.addressLine1, 'Ingresa la dirección', 5, 200);
  if (address) errors.addressLine1 = address;
  if (form.addressLine2.trim().length > 200) {
    errors.addressLine2 = 'Debe tener máximo 200 caracteres';
  }
  const city = required(form.city, 'Ingresa la ciudad', 2, 80);
  if (city) errors.city = city;
  const region = required(form.region, 'Ingresa el departamento', 2, 80);
  if (region) errors.region = region;
  const postalCode = form.postalCode.trim();
  if (postalCode && !POSTAL_CODE.test(postalCode)) {
    errors.postalCode = 'Debe tener 6 dígitos';
  }
  return errors;
};
