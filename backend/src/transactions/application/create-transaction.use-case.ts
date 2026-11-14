import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentStatusPoller } from '../../payments/application/payment-status-poller';
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from '../../payments/domain/payment-gateway.port';
import { Product } from '../../products/domain/product';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../products/domain/product.repository';
import { AppError, unexpected } from '../../shared/domain/app-error';
import { err, fromPromise, ok, Result } from '../../shared/domain/result';
import {
  calculateAmounts,
  CardBrand,
  CHECKOUT_FEES,
  type CheckoutFees,
  CustomerData,
  DeliveryAddress,
  NewOrder,
  TransactionDetails,
} from '../domain/transaction';
import {
  TRANSACTION_REPOSITORY,
  type TransactionRepository,
} from '../domain/transaction.repository';
import { findAvailableProduct } from './find-available-product';
import { loadTransaction, settleTransaction } from './transaction-settlement';

export interface CreateTransactionCommand {
  productId: string;
  quantity: number;
  idempotencyKey: string | null;
  customer: CustomerData;
  delivery: DeliveryAddress;
  payment: {
    cardToken: string;
    installments: number;
    cardBrand: CardBrand;
    cardLastFour: string;
    acceptanceToken: string;
    personalDataAuthToken: string;
  };
}

/** Message shown to the customer when the payment could not even start. */
export const PAYMENT_NOT_PROCESSED =
  'The payment could not be processed. No charge was made.';

/**
 * Checkout use case, written as a railway:
 *
 *   find product → check stock → create PENDING (reserves stock)
 *     → charge the card → wait for the result → settle
 *
 * Any failing step short-circuits the rest. Once the PENDING transaction
 * exists, the customer always gets it back with its current status, even
 * if the payment failed, so the UI can show what happened.
 */
@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactions: TransactionRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly poller: PaymentStatusPoller,
    @Inject(CHECKOUT_FEES) private readonly fees: CheckoutFees,
  ) {}

  async execute(
    command: CreateTransactionCommand,
  ): Promise<Result<TransactionDetails, AppError>> {
    const existing = await this.findByIdempotencyKey(command.idempotencyKey);
    return existing.andThenAsync((found) =>
      found ? Promise.resolve(ok(found)) : this.checkout(command),
    );
  }

  private async checkout(
    command: CreateTransactionCommand,
  ): Promise<Result<TransactionDetails, AppError>> {
    const product = await findAvailableProduct(
      this.products,
      command.productId,
      command.quantity,
    );
    const pending = await product.andThenAsync((p) =>
      this.createPending(this.buildOrder(command, p)),
    );
    return pending.andThenAsync((transaction) =>
      this.charge(transaction, command.payment),
    );
  }

  /** A retried request (same Idempotency-Key) gets the original result. */
  private async findByIdempotencyKey(
    key: string | null,
  ): Promise<Result<TransactionDetails | null, AppError>> {
    if (!key) return ok(null);
    return fromPromise(this.transactions.findByIdempotencyKey(key), unexpected);
  }

  private buildOrder(command: CreateTransactionCommand, product: Product) {
    const order: NewOrder = {
      reference: randomUUID(),
      idempotencyKey: command.idempotencyKey,
      productId: product.id,
      amounts: calculateAmounts(
        product.priceInCents,
        command.quantity,
        product.currency,
        this.fees,
      ),
      customer: {
        fullName: command.customer.fullName.trim(),
        email: command.customer.email.trim().toLowerCase(),
        phone: command.customer.phone.trim(),
      },
      delivery: command.delivery,
      card: {
        brand: command.payment.cardBrand,
        lastFour: command.payment.cardLastFour,
      },
    };
    return order;
  }

  private async createPending(
    order: NewOrder,
  ): Promise<Result<TransactionDetails, AppError>> {
    const created = await fromPromise(
      this.transactions.createPending(order),
      unexpected,
    );
    return created.andThen((result) => result);
  }

  private async charge(
    transaction: TransactionDetails,
    payment: CreateTransactionCommand['payment'],
  ): Promise<Result<TransactionDetails, AppError>> {
    const charge = await this.gateway.createCardPayment({
      reference: transaction.reference,
      amountInCents: transaction.amounts.totalAmountInCents,
      currency: transaction.amounts.currency,
      customerEmail: transaction.customer.email,
      cardToken: payment.cardToken,
      installments: payment.installments,
      acceptanceToken: payment.acceptanceToken,
      personalDataAuthToken: payment.personalDataAuthToken,
    });

    if (charge.isErr) {
      // Nothing was charged: release the stock and report the failure.
      return settleTransaction(
        this.transactions,
        transaction.id,
        'ERROR',
        PAYMENT_NOT_PROCESSED,
      );
    }

    const attached = await fromPromise(
      this.transactions.attachGatewayTransaction(
        transaction.id,
        charge.value.id,
      ),
      unexpected,
    );
    if (attached.isErr) return err(attached.error);

    const final = await this.poller.waitForFinalStatus(charge.value.id);
    if (final.isErr) {
      // We do not know the result yet: keep it PENDING.
      // GET /transactions/:id will sync it with the gateway later.
      return loadTransaction(this.transactions, transaction.id);
    }
    return settleTransaction(
      this.transactions,
      transaction.id,
      final.value.status,
      final.value.statusMessage,
    );
  }
}
