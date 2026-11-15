import {
  PAYMENT_STATUSES,
  PaymentStatus,
} from '../domain/payment-gateway.port';

/**
 * An unknown status is treated as PENDING (not final) on purpose: marking
 * it as failed could leave a customer charged without their product.
 * A PENDING payment can still be reconciled later.
 */
export const toPaymentStatus = (status: string): PaymentStatus =>
  (PAYMENT_STATUSES as readonly string[]).includes(status)
    ? (status as PaymentStatus)
    : 'PENDING';
