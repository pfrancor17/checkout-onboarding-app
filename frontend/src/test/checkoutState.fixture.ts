import type { RootState } from '../app/store';
import { initialCheckoutState } from '../features/checkout/checkoutSlice';

/** A customer who filled the form and is on the summary step. */
export const summaryCheckoutState = (
  overrides: Partial<RootState['checkout']> = {},
): RootState['checkout'] => ({
  ...initialCheckoutState,
  step: 'SUMMARY',
  productId: 'prod-1',
  quantity: 2,
  customer: {
    fullName: ' Jane Doe ',
    email: ' jane@example.com ',
    phone: '300 123 4567',
  },
  delivery: {
    addressLine1: 'Calle 10 # 20-30',
    addressLine2: '',
    city: 'Medellín',
    region: 'Antioquia',
    postalCode: '050021',
  },
  card: { brand: 'VISA', lastFour: '4242' },
  installments: 3,
  ...overrides,
});
