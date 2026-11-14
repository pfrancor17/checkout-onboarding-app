import { Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from '../../payments/domain/payment-gateway.port';
import { AppError } from '../../shared/domain/app-error';
import { ok, Result } from '../../shared/domain/result';
import { TransactionDetails } from '../domain/transaction';
import {
  TRANSACTION_REPOSITORY,
  type TransactionRepository,
} from '../domain/transaction.repository';
import { loadTransaction, settleTransaction } from './transaction-settlement';

/**
 * Returns a transaction. If it is still PENDING, asks the gateway once for
 * its status and settles it. This is how the app recovers after a refresh
 * or when the payment took longer than the checkout request.
 */
@Injectable()
export class GetTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactions: TransactionRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async execute(id: string): Promise<Result<TransactionDetails, AppError>> {
    const found = await loadTransaction(this.transactions, id);
    return found.andThenAsync((transaction) => this.syncIfPending(transaction));
  }

  private async syncIfPending(
    transaction: TransactionDetails,
  ): Promise<Result<TransactionDetails, AppError>> {
    if (transaction.status !== 'PENDING' || !transaction.gatewayTransactionId) {
      return ok(transaction);
    }

    const remote = await this.gateway.getTransaction(
      transaction.gatewayTransactionId,
    );
    if (remote.isErr || remote.value.status === 'PENDING') {
      return ok(transaction);
    }
    return settleTransaction(
      this.transactions,
      transaction.id,
      remote.value.status,
      remote.value.statusMessage,
    );
  }
}
