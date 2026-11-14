import { AppError, notFound, unexpected } from '../../shared/domain/app-error';
import { err, fromPromise, ok, Result } from '../../shared/domain/result';
import {
  resolvePayment,
  TransactionDetails,
  TransactionStatus,
} from '../domain/transaction';
import { TransactionRepository } from '../domain/transaction.repository';

export const loadTransaction = async (
  transactions: TransactionRepository,
  id: string,
): Promise<Result<TransactionDetails, AppError>> => {
  const found = await fromPromise(transactions.findById(id), unexpected);
  return found.andThen((transaction) =>
    transaction
      ? ok(transaction)
      : err(notFound(`Transaction ${id} was not found`)),
  );
};

/**
 * Applies the payment result (if final) and returns the fresh transaction.
 * Safe to call more than once: the repository ignores already settled ones.
 */
export const settleTransaction = async (
  transactions: TransactionRepository,
  id: string,
  status: TransactionStatus,
  statusMessage: string | null,
): Promise<Result<TransactionDetails, AppError>> => {
  const resolution = resolvePayment(status, statusMessage);
  const settled = resolution
    ? await fromPromise(transactions.finalize(id, resolution), unexpected)
    : ok<boolean, AppError>(false);

  return settled.andThenAsync(() => loadTransaction(transactions, id));
};
