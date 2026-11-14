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
  /** Total time budget; keeps the HTTP request under API Gateway's 29 s. */
  maxWaitMs: number;
}

/** Time source, injectable so tests do not wait for real. */
export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const PAYMENT_POLLING_CONFIG = Symbol('PAYMENT_POLLING_CONFIG');
export const CLOCK = Symbol('CLOCK');

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Card payments are asynchronous: the gateway answers PENDING first.
 * This service asks for the status until it is final, attempts run out
 * or the time budget is spent.
 *
 * - A final status (APPROVED, DECLINED, VOIDED, ERROR) is returned at once.
 * - Otherwise the last PENDING transaction is returned (Ok): the payment
 *   is still in progress, not failed.
 * - A transient gateway error is retried; only the last one is returned.
 */
@Injectable()
export class PaymentStatusPoller {
  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(PAYMENT_POLLING_CONFIG)
    private readonly config: PaymentPollingConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async waitForFinalStatus(
    gatewayTransactionId: string,
  ): Promise<Result<GatewayTransaction, AppError>> {
    const deadline = this.clock.now() + this.config.maxWaitMs;
    let last!: Result<GatewayTransaction, AppError>;

    for (let attempt = 1; attempt <= this.config.attempts; attempt++) {
      last = await this.gateway.getTransaction(gatewayTransactionId);

      if (last.isOk && isFinalStatus(last.value.status)) {
        return last;
      }

      const isLastAttempt = attempt === this.config.attempts;
      const fitsInBudget = this.clock.now() + this.config.intervalMs < deadline;
      if (isLastAttempt || !fitsInBudget) {
        break;
      }
      await this.clock.sleep(this.config.intervalMs);
    }

    return last;
  }
}
