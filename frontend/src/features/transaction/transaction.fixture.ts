import type { Transaction } from './types';

export const buildTransaction = (
  overrides: Partial<Transaction> = {},
): Transaction => ({
  id: 'tx-1',
  reference: 'ref-1',
  status: 'APPROVED',
  statusMessage: null,
  product: { id: 'prod-1', name: 'Parlante portátil' },
  amounts: {
    unitPriceInCents: 15_450_000,
    quantity: 1,
    productAmountInCents: 15_450_000,
    baseFeeInCents: 300_000,
    deliveryFeeInCents: 1_000_000,
    totalAmountInCents: 16_750_000,
    currency: 'COP',
  },
  card: { brand: 'VISA', lastFour: '4242' },
  customer: { id: 'cust-1', fullName: 'Jane Doe', email: 'j***@example.com' },
  delivery: {
    id: 'del-1',
    status: 'ASSIGNED',
    addressLine1: 'Calle 10 # 20-30',
    addressLine2: null,
    city: 'Medellín',
    region: 'Antioquia',
    postalCode: null,
  },
  createdAt: '2026-11-15T00:00:00.000Z',
  updatedAt: '2026-11-15T00:00:00.000Z',
  ...overrides,
});
