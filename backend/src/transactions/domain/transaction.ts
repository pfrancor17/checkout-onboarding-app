import { PaymentStatus } from '../../payments/domain/payment-gateway.port';

export type TransactionStatus = PaymentStatus;

export const DELIVERY_STATUSES = ['PENDING', 'ASSIGNED', 'CANCELLED'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const CARD_BRANDS = ['VISA', 'MASTERCARD'] as const;
export type CardBrand = (typeof CARD_BRANDS)[number];

/** Business rule: a single order can take at most this many units. */
export const MAX_UNITS_PER_ORDER = 5;

export interface CheckoutFees {
  /** Charged on every purchase. */
  baseFeeInCents: number;
  deliveryFeeInCents: number;
}

export const CHECKOUT_FEES = Symbol('CHECKOUT_FEES');

export interface Amounts {
  unitPriceInCents: number;
  quantity: number;
  productAmountInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalAmountInCents: number;
  currency: string;
}

export const calculateAmounts = (
  unitPriceInCents: number,
  quantity: number,
  currency: string,
  fees: CheckoutFees,
): Amounts => {
  const productAmountInCents = unitPriceInCents * quantity;
  return {
    unitPriceInCents,
    quantity,
    productAmountInCents,
    baseFeeInCents: fees.baseFeeInCents,
    deliveryFeeInCents: fees.deliveryFeeInCents,
    totalAmountInCents:
      productAmountInCents + fees.baseFeeInCents + fees.deliveryFeeInCents,
    currency,
  };
};

export interface CustomerData {
  fullName: string;
  email: string;
  phone: string;
}

export interface DeliveryAddress {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string;
  postalCode: string | null;
}

/** Only what is safe to keep: never the card number, CVC or expiry. */
export interface CardSummary {
  brand: CardBrand;
  lastFour: string;
}

export interface NewOrder {
  reference: string;
  idempotencyKey: string | null;
  productId: string;
  amounts: Amounts;
  customer: CustomerData;
  delivery: DeliveryAddress;
  card: CardSummary;
}

export interface TransactionDetails {
  id: string;
  reference: string;
  status: TransactionStatus;
  statusMessage: string | null;
  gatewayTransactionId: string | null;
  product: { id: string; name: string };
  amounts: Amounts;
  card: CardSummary;
  customer: CustomerData & { id: string };
  delivery: DeliveryAddress & { id: string; status: DeliveryStatus };
  createdAt: Date;
  updatedAt: Date;
}

/** What has to happen when a payment reaches a final status. */
export interface Resolution {
  status: Exclude<TransactionStatus, 'PENDING'>;
  statusMessage: string | null;
  deliveryStatus: DeliveryStatus;
  /** The reserved units go back to stock when the payment did not succeed. */
  releaseStock: boolean;
}

/**
 * Stock is reserved when the transaction is created (PENDING), so two
 * customers can never pay for the same last unit.
 * - APPROVED: the units stay sold and the delivery is assigned.
 * - DECLINED / VOIDED / ERROR: the units go back to stock and the
 *   delivery is cancelled.
 * - PENDING: nothing to resolve yet (returns null).
 */
export const resolvePayment = (
  status: TransactionStatus,
  statusMessage: string | null,
): Resolution | null => {
  if (status === 'PENDING') return null;
  const approved = status === 'APPROVED';
  return {
    status,
    statusMessage,
    deliveryStatus: approved ? 'ASSIGNED' : 'CANCELLED',
    releaseStock: !approved,
  };
};
