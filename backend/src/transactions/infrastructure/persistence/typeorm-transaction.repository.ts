import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  MoreThanOrEqual,
} from 'typeorm';
import { CustomerOrmEntity } from '../../../customers/infrastructure/persistence/customer.orm-entity';
import { DeliveryOrmEntity } from '../../../deliveries/infrastructure/persistence/delivery.orm-entity';
import { ProductOrmEntity } from '../../../products/infrastructure/persistence/product.orm-entity';
import { AppError, conflict } from '../../../shared/domain/app-error';
import { err, ok, Result } from '../../../shared/domain/result';
import {
  NewOrder,
  Resolution,
  TransactionDetails,
} from '../../domain/transaction';
import { TransactionRepository } from '../../domain/transaction.repository';
import { toTransactionDetails } from './transaction.mapper';
import { TransactionOrmEntity } from './transaction.orm-entity';

class OutOfStockError extends Error {}

const UNIQUE_VIOLATION = '23505';
const STATUS_MESSAGE_MAX_LENGTH = 255;

const isIdempotencyKeyViolation = (error: unknown): boolean => {
  const driverError = error as { code?: string; detail?: string };
  return (
    driverError?.code === UNIQUE_VIOLATION &&
    (driverError.detail ?? '').includes('idempotency_key')
  );
};

const RELATIONS = { product: true, customer: true, delivery: true } as const;

/**
 * PostgreSQL adapter for the checkout. Every multi-step write runs inside
 * a database transaction, so stock, transaction and delivery never get
 * out of sync.
 */
@Injectable()
export class TypeOrmTransactionRepository implements TransactionRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createPending(
    order: NewOrder,
  ): Promise<Result<TransactionDetails, AppError>> {
    try {
      const id = await this.dataSource.transaction((manager) =>
        this.insertPendingOrder(manager, order),
      );
      return ok(await this.findByIdOrFail(id));
    } catch (error) {
      if (error instanceof OutOfStockError) {
        return err(conflict('The product ran out of stock'));
      }
      if (isIdempotencyKeyViolation(error)) {
        return err(
          conflict(
            'A payment with this Idempotency-Key is already in progress',
          ),
        );
      }
      throw error;
    }
  }

  findById(id: string): Promise<TransactionDetails | null> {
    return this.findOne({ id });
  }

  findByIdempotencyKey(key: string): Promise<TransactionDetails | null> {
    return this.findOne({ idempotencyKey: key });
  }

  async attachGatewayTransaction(
    id: string,
    gatewayTransactionId: string,
  ): Promise<void> {
    await this.dataSource.manager.update(
      TransactionOrmEntity,
      { id },
      { gatewayTransactionId },
    );
  }

  finalize(id: string, resolution: Resolution): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      // Only a PENDING transaction can be settled: the row lock taken by
      // this UPDATE makes concurrent settlements wait and then do nothing.
      const updated = await manager.update(
        TransactionOrmEntity,
        { id, status: 'PENDING' },
        {
          status: resolution.status,
          statusMessage:
            resolution.statusMessage?.slice(0, STATUS_MESSAGE_MAX_LENGTH) ??
            null,
        },
      );
      if (!updated.affected) return false;

      await manager.update(
        DeliveryOrmEntity,
        { transactionId: id },
        { status: resolution.deliveryStatus },
      );

      if (resolution.releaseStock) {
        const transaction = await manager.findOneByOrFail(
          TransactionOrmEntity,
          { id },
        );
        await manager.increment(
          ProductOrmEntity,
          { id: transaction.productId },
          'stock',
          transaction.quantity,
        );
      }
      return true;
    });
  }

  private async insertPendingOrder(
    manager: EntityManager,
    order: NewOrder,
  ): Promise<string> {
    const { quantity } = order.amounts;

    // Atomic reservation: only succeeds if there is enough stock left.
    const reserved = await manager.decrement(
      ProductOrmEntity,
      { id: order.productId, stock: MoreThanOrEqual(quantity) },
      'stock',
      quantity,
    );
    if (!reserved.affected) throw new OutOfStockError();

    // A returning customer is matched by email and their data refreshed.
    await manager.upsert(CustomerOrmEntity, { ...order.customer }, ['email']);
    const customer = await manager.findOneByOrFail(CustomerOrmEntity, {
      email: order.customer.email,
    });

    const transaction = await manager.save(
      manager.create(TransactionOrmEntity, {
        reference: order.reference,
        idempotencyKey: order.idempotencyKey,
        productId: order.productId,
        customerId: customer.id,
        quantity,
        unitPriceInCents: order.amounts.unitPriceInCents,
        productAmountInCents: order.amounts.productAmountInCents,
        baseFeeInCents: order.amounts.baseFeeInCents,
        deliveryFeeInCents: order.amounts.deliveryFeeInCents,
        totalAmountInCents: order.amounts.totalAmountInCents,
        currency: order.amounts.currency,
        status: 'PENDING',
        cardBrand: order.card.brand,
        cardLastFour: order.card.lastFour,
      }),
    );

    await manager.save(
      manager.create(DeliveryOrmEntity, {
        transactionId: transaction.id,
        recipientName: order.customer.fullName,
        phone: order.customer.phone,
        addressLine1: order.delivery.addressLine1,
        addressLine2: order.delivery.addressLine2,
        city: order.delivery.city,
        region: order.delivery.region,
        postalCode: order.delivery.postalCode,
        status: 'PENDING',
      }),
    );

    return transaction.id;
  }

  private async findOne(
    where: FindOptionsWhere<TransactionOrmEntity>,
  ): Promise<TransactionDetails | null> {
    const entity = await this.dataSource.manager.findOne(TransactionOrmEntity, {
      where,
      relations: RELATIONS,
    });
    return entity ? toTransactionDetails(entity) : null;
  }

  private async findByIdOrFail(id: string): Promise<TransactionDetails> {
    const found = await this.findById(id);
    if (!found) throw new Error(`Transaction ${id} vanished after insert`);
    return found;
  }
}
