import { NewOrder, TransactionDetails } from './transaction';

export const TX_ID = '2446b55d-abb9-4e52-8a53-f82cbbdf26a1';
export const PRODUCT_ID = '6f1c3b5e-8a4d-4b8e-9c2a-1d2e3f4a5b6c';

export const buildOrder = (overrides: Partial<NewOrder> = {}): NewOrder => ({
  reference: 'ref-1',
  idempotencyKey: null,
  productId: PRODUCT_ID,
  amounts: {
    unitPriceInCents: 1_000_000,
    quantity: 1,
    productAmountInCents: 1_000_000,
    baseFeeInCents: 300_000,
    deliveryFeeInCents: 1_000_000,
    totalAmountInCents: 2_300_000,
    currency: 'COP',
  },
  customer: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '3001234567',
  },
  delivery: {
    addressLine1: 'Calle 10 # 20-30',
    addressLine2: null,
    city: 'Medellín',
    region: 'Antioquia',
    postalCode: '050021',
  },
  card: { brand: 'VISA', lastFour: '4242' },
  ...overrides,
});

export const buildTransaction = (
  overrides: Partial<TransactionDetails> = {},
): TransactionDetails => {
  const order = buildOrder();
  return {
    id: TX_ID,
    reference: order.reference,
    status: 'PENDING',
    statusMessage: null,
    gatewayTransactionId: null,
    product: { id: PRODUCT_ID, name: 'Test Product' },
    amounts: order.amounts,
    card: order.card,
    customer: { id: 'cust-1', ...order.customer },
    delivery: { id: 'del-1', status: 'PENDING', ...order.delivery },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
};
