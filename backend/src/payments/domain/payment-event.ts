import { PaymentStatus } from './payment-gateway.port';

/**
 * A payment status change notified by the gateway (webhook), already
 * verified and translated into domain terms.
 */
export interface PaymentEvent {
  gatewayTransactionId: string;
  /** Our own reference, sent when the payment was created. */
  reference: string;
  status: PaymentStatus;
  amountInCents: number;
  statusMessage: string | null;
}
