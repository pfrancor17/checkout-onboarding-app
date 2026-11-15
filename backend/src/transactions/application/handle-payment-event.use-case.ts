import { Inject, Injectable, Logger } from '@nestjs/common';
import { PaymentEvent } from '../../payments/domain/payment-event';
import { AppError, unexpected } from '../../shared/domain/app-error';
import { fromPromise, ok, Result } from '../../shared/domain/result';
import { resolvePayment, TransactionDetails } from '../domain/transaction';
import {
  TRANSACTION_REPOSITORY,
  type TransactionRepository,
} from '../domain/transaction.repository';

export type PaymentEventOutcome =
  | 'SETTLED'
  | 'ALREADY_SETTLED'
  | 'STILL_PENDING'
  | 'IGNORED_UNKNOWN_REFERENCE'
  | 'IGNORED_AMOUNT_MISMATCH';

/**
 * Applies a verified payment event from the gateway (webhook).
 *
 * It is the push counterpart of GET /transactions/:id: PENDING payments
 * get settled even if the customer closed the app. Safe to receive the
 * same event many times (the gateway retries): a transaction is settled
 * only once.
 */
@Injectable()
export class HandlePaymentEventUseCase {
  private readonly logger = new Logger(HandlePaymentEventUseCase.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactions: TransactionRepository,
  ) {}

  async execute(
    event: PaymentEvent,
  ): Promise<Result<PaymentEventOutcome, AppError>> {
    const found = await fromPromise(
      this.transactions.findByReference(event.reference),
      unexpected,
    );
    return found.andThenAsync((transaction) =>
      transaction
        ? this.apply(transaction, event)
        : Promise.resolve(
            ok<PaymentEventOutcome, AppError>('IGNORED_UNKNOWN_REFERENCE'),
          ),
    );
  }

  private async apply(
    transaction: TransactionDetails,
    event: PaymentEvent,
  ): Promise<Result<PaymentEventOutcome, AppError>> {
    if (transaction.amounts.totalAmountInCents !== event.amountInCents) {
      // Never settle a payment for an amount different from the order.
      this.logger.warn(
        `Event amount ${event.amountInCents} does not match transaction ${transaction.id} (${transaction.amounts.totalAmountInCents})`,
      );
      return ok('IGNORED_AMOUNT_MISMATCH');
    }
    if (transaction.status !== 'PENDING') return ok('ALREADY_SETTLED');

    return fromPromise(this.settle(transaction, event), unexpected);
  }

  private async settle(
    transaction: TransactionDetails,
    event: PaymentEvent,
  ): Promise<PaymentEventOutcome> {
    if (!transaction.gatewayTransactionId) {
      await this.transactions.attachGatewayTransaction(
        transaction.id,
        event.gatewayTransactionId,
      );
    }
    const resolution = resolvePayment(event.status, event.statusMessage);
    if (!resolution) return 'STILL_PENDING';

    const settled = await this.transactions.finalize(
      transaction.id,
      resolution,
    );
    return settled ? 'SETTLED' : 'ALREADY_SETTLED';
  }
}
