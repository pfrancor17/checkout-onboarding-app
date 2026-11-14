import { Inject, Injectable } from '@nestjs/common';
import {
  CLOCK,
  type Clock,
} from '../../payments/application/payment-status-poller';
import {
  GatewayTransaction,
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from '../../payments/domain/payment-gateway.port';
import { AppError, unexpected } from '../../shared/domain/app-error';
import { err, fromPromise, ok, Result } from '../../shared/domain/result';
import {
  PAYMENT_NOT_PROCESSED,
  TransactionDetails,
  UNCONFIRMED_PAYMENT_GRACE_MS,
} from '../domain/transaction';
import {
  TRANSACTION_REPOSITORY,
  type TransactionRepository,
} from '../domain/transaction.repository';
import { loadTransaction, settleTransaction } from './transaction-settlement';

/**
 * Returns a transaction. If it is still PENDING, asks the gateway once for
 * its status and settles it. This is how the app recovers after a refresh,
 * when the payment took longer than the checkout request, or when the
 * gateway did not answer while creating the payment.
 */
@Injectable()
export class GetTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactions: TransactionRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<Result<TransactionDetails, AppError>> {
    const found = await loadTransaction(this.transactions, id);
    return found.andThenAsync((transaction) =>
      transaction.status === 'PENDING'
        ? this.sync(transaction)
        : Promise.resolve(ok(transaction)),
    );
  }

  private async sync(
    transaction: TransactionDetails,
  ): Promise<Result<TransactionDetails, AppError>> {
    const remote = await this.lookUp(transaction);
    if (remote.isErr) {
      // Gateway not reachable right now: try again on the next read.
      return ok(transaction);
    }

    if (remote.value === null) {
      return this.resolveNeverReachedGateway(transaction);
    }

    if (!transaction.gatewayTransactionId) {
      const attached = await fromPromise(
        this.transactions.attachGatewayTransaction(
          transaction.id,
          remote.value.id,
        ),
        unexpected,
      );
      if (attached.isErr) return err(attached.error);
    }

    return settleTransaction(
      this.transactions,
      transaction.id,
      remote.value.status,
      remote.value.statusMessage,
    );
  }

  /** By gateway id when we have it, otherwise by our own reference. */
  private async lookUp(
    transaction: TransactionDetails,
  ): Promise<Result<GatewayTransaction | null, AppError>> {
    if (transaction.gatewayTransactionId) {
      return this.gateway.getTransaction(transaction.gatewayTransactionId);
    }
    return this.gateway.findTransactionByReference(transaction.reference);
  }

  /**
   * The gateway has no payment with our reference. Right after checkout it
   * may still be arriving, so we wait a grace period; after that it never
   * will, so nothing was charged and the reserved stock is released.
   */
  private resolveNeverReachedGateway(
    transaction: TransactionDetails,
  ): Promise<Result<TransactionDetails, AppError>> {
    const age = this.clock.now() - transaction.createdAt.getTime();
    if (age < UNCONFIRMED_PAYMENT_GRACE_MS) {
      return Promise.resolve(ok(transaction));
    }
    return settleTransaction(
      this.transactions,
      transaction.id,
      'ERROR',
      PAYMENT_NOT_PROCESSED,
    );
  }
}
