import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  gatewayUnavailable,
  paymentGatewayError,
} from '../../shared/domain/app-error';
import { err, ok, Result } from '../../shared/domain/result';
import {
  AcceptanceTokens,
  CardPaymentRequest,
  GatewayTransaction,
  PAYMENT_STATUSES,
  PaymentGateway,
  PaymentStatus,
} from '../domain/payment-gateway.port';
import { buildIntegritySignature } from './integrity-signature';
import {
  PAYMENT_GATEWAY_CONFIG,
  type PaymentGatewayConfig,
} from './payment-gateway.config';

interface MerchantData {
  presigned_acceptance: { acceptance_token: string; permalink: string };
  presigned_personal_data_auth: { acceptance_token: string; permalink: string };
}

interface TransactionData {
  id: string;
  reference: string;
  status: string;
  amount_in_cents: number;
  status_message?: string | null;
}

interface GatewayEnvelope<T> {
  data?: T;
  error?: { type?: string; reason?: string; messages?: unknown };
}

/**
 * An unknown status is treated as PENDING (not final) on purpose: marking
 * it as failed could leave a customer charged without their product.
 * A PENDING payment can still be reconciled later.
 */
const toPaymentStatus = (status: string): PaymentStatus =>
  (PAYMENT_STATUSES as readonly string[]).includes(status)
    ? (status as PaymentStatus)
    : 'PENDING';

const toGatewayTransaction = (data: TransactionData): GatewayTransaction => ({
  id: data.id,
  reference: data.reference,
  status: toPaymentStatus(data.status),
  amountInCents: data.amount_in_cents,
  statusMessage: data.status_message ?? null,
});

/**
 * Driven adapter for the payment provider's REST API (sandbox).
 * Every failure is returned on the error track; nothing is thrown.
 * Keys and card tokens are never logged.
 */
@Injectable()
export class HttpPaymentGateway implements PaymentGateway {
  constructor(
    @Inject(PAYMENT_GATEWAY_CONFIG)
    private readonly config: PaymentGatewayConfig,
  ) {}

  async getAcceptanceTokens(): Promise<Result<AcceptanceTokens, AppError>> {
    const result = await this.request<MerchantData>(
      `/merchants/${this.config.publicKey}`,
    );
    return result.map((merchant) => ({
      acceptanceToken: merchant.presigned_acceptance.acceptance_token,
      termsUrl: merchant.presigned_acceptance.permalink,
      personalDataAuthToken:
        merchant.presigned_personal_data_auth.acceptance_token,
      personalDataPolicyUrl: merchant.presigned_personal_data_auth.permalink,
    }));
  }

  async createCardPayment(
    request: CardPaymentRequest,
  ): Promise<Result<GatewayTransaction, AppError>> {
    const body = {
      acceptance_token: request.acceptanceToken,
      accept_personal_auth: request.personalDataAuthToken,
      amount_in_cents: request.amountInCents,
      currency: request.currency,
      customer_email: request.customerEmail,
      reference: request.reference,
      signature: buildIntegritySignature(
        request.reference,
        request.amountInCents,
        request.currency,
        this.config.integritySecret,
      ),
      payment_method: {
        type: 'CARD',
        token: request.cardToken,
        installments: request.installments,
      },
    };

    const result = await this.request<TransactionData>('/transactions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return result.map(toGatewayTransaction);
  }

  async getTransaction(
    id: string,
  ): Promise<Result<GatewayTransaction, AppError>> {
    const result = await this.request<TransactionData>(
      `/transactions/${encodeURIComponent(id)}`,
    );
    return result.map(toGatewayTransaction);
  }

  async findTransactionByReference(
    reference: string,
  ): Promise<Result<GatewayTransaction | null, AppError>> {
    const result = await this.request<TransactionData[]>(
      `/transactions?reference=${encodeURIComponent(reference)}`,
    );
    return result.map((list) =>
      list.length > 0 ? toGatewayTransaction(list[0]) : null,
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<Result<T, AppError>> {
    let response: Response;
    try {
      response = await fetch(`${this.config.apiUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.privateKey}`,
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (cause) {
      // Timeout or network error: we cannot know if it was processed.
      return err(gatewayUnavailable('Payment gateway is unreachable', cause));
    }

    const envelope = (await response
      .json()
      .catch(() => ({}))) as GatewayEnvelope<T>;

    if (response.status >= 500) {
      // The gateway failed on its side: the outcome is unknown too.
      return err(
        gatewayUnavailable(
          `Payment gateway is unavailable (HTTP ${response.status})`,
          envelope.error,
        ),
      );
    }
    if (!response.ok || envelope.data === undefined) {
      return err(
        paymentGatewayError(
          `Payment gateway rejected the request (HTTP ${response.status})`,
          envelope.error,
        ),
      );
    }
    return ok(envelope.data);
  }
}
