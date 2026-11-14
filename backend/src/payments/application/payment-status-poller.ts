import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../shared/domain/app-error';
import { Result } from '../../shared/domain/result';
import {
  GatewayTransaction,
  isFinalStatus,
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from '../domain/payment-gateway.port';

export interface PaymentPollingConfig {
  attempts: number;
  intervalMs: number;
}

export const PAYMENT_POLLING_CONFIG = Symbol('PAYMENT_POLLING_CONFIG');
export const SLEEP = Symbol('SLEEP');
export type Sleep = (ms: number) => Promise<void>;
export const defaultSleep: Sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Card payments are asynchronous: the gateway answers PENDING first.
 * This service asks for the status until it is final or attempts run out.
 *
 * - A final status (APPROVED, DECLINED, VOIDED, ERROR) is returned at once.
 * - If attempts run out, the last PENDING transaction is returned (Ok):
 *   the payment is still in progress, not failed.
 * - A transient gateway error is retried; only the last one is returned.
 */
@Injectable()
export class PaymentStatusPoller {
  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(PAYMENT_POLLING_CONFIG)
    private readonly config: PaymentPollingConfig,
    @Inject(SLEEP) private readonly sleep: Sleep,
  ) {}

  async waitForFinalStatus(
    gatewayTransactionId: string,
  ): Promise<Result<GatewayTransaction, AppError>> {
    let last!: Result<GatewayTransaction, AppError>;

    for (let attempt = 1; attempt <= this.config.attempts; attempt++) {
      last = await this.gateway.getTransaction(gatewayTransactionId);

      if (last.isOk && isFinalStatus(last.value.status)) {
        return last;
      }
      if (attempt < this.config.attempts) {
        await this.sleep(this.config.intervalMs);
      }
    }

    return last;
  }
}
