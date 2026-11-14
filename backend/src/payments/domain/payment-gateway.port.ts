import { AppError } from '../../shared/domain/app-error';
import { Result } from '../../shared/domain/result';

export const PAYMENT_STATUSES = [
  'PENDING',
  'APPROVED',
  'DECLINED',
  'VOIDED',
  'ERROR',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** A payment is final once the gateway will not change its status anymore. */
export const isFinalStatus = (status: PaymentStatus): boolean =>
  status !== 'PENDING';

/**
 * Legal acceptances the customer must agree to before paying.
 * Each token can be used for ONE payment only: a retry needs new tokens.
 */
export interface AcceptanceTokens {
  acceptanceToken: string;
  termsUrl: string;
  personalDataAuthToken: string;
  personalDataPolicyUrl: string;
}

export interface CardPaymentRequest {
  /** Our own unique reference (the local transaction id). */
  reference: string;
  amountInCents: number;
  currency: string;
  customerEmail: string;
  /** Card token created by the frontend; raw card data never reaches us. */
  cardToken: string;
  installments: number;
  acceptanceToken: string;
  personalDataAuthToken: string;
}

export interface GatewayTransaction {
  id: string;
  reference: string;
  status: PaymentStatus;
  amountInCents: number;
  statusMessage: string | null;
}

/** Output port: what the application needs from any payment provider. */
export interface PaymentGateway {
  getAcceptanceTokens(): Promise<Result<AcceptanceTokens, AppError>>;
  createCardPayment(
    request: CardPaymentRequest,
  ): Promise<Result<GatewayTransaction, AppError>>;
  getTransaction(id: string): Promise<Result<GatewayTransaction, AppError>>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
