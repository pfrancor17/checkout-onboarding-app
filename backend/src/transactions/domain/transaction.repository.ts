import { AppError } from '../../shared/domain/app-error';
import { Result } from '../../shared/domain/result';
import { NewOrder, Resolution, TransactionDetails } from './transaction';

/** Output port for the checkout persistence. */
export interface TransactionRepository {
  /**
   * Atomically reserves the stock, upserts the customer and stores the
   * PENDING transaction with its delivery.
   * Returns CONFLICT when the stock ran out or the idempotency key is taken.
   */
  createPending(order: NewOrder): Promise<Result<TransactionDetails, AppError>>;

  findById(id: string): Promise<TransactionDetails | null>;

  findByIdempotencyKey(key: string): Promise<TransactionDetails | null>;

  attachGatewayTransaction(
    id: string,
    gatewayTransactionId: string,
  ): Promise<void>;

  /**
   * Applies a final status only if the transaction is still PENDING.
   * Returns false when it was already settled, so a payment can never be
   * settled twice (e.g. stock released twice).
   */
  finalize(id: string, resolution: Resolution): Promise<boolean>;
}

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');
