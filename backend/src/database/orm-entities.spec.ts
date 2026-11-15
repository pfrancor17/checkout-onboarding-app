import { getMetadataArgsStorage } from 'typeorm';
import { CustomerOrmEntity } from '../customers/infrastructure/persistence/customer.orm-entity';
import { DeliveryOrmEntity } from '../deliveries/infrastructure/persistence/delivery.orm-entity';
import { ProductOrmEntity } from '../products/infrastructure/persistence/product.orm-entity';
import { TransactionOrmEntity } from '../transactions/infrastructure/persistence/transaction.orm-entity';

/**
 * Checks the ORM mapping matches the migrations: table names, snake_case
 * columns and relations (with their inverse sides).
 */
describe('ORM entities', () => {
  const storage = getMetadataArgsStorage();

  const tableOf = (target: unknown) =>
    storage.tables.find((table) => table.target === target)?.name;

  const columnsOf = (target: unknown) =>
    Object.fromEntries(
      storage.columns
        .filter((column) => column.target === target)
        .map((column) => [column.propertyName, column.options.name]),
    );

  const relation = (target: unknown, propertyName: string) => {
    const found = storage.relations.find(
      (r) => r.target === target && r.propertyName === propertyName,
    );
    if (!found) throw new Error(`Relation ${propertyName} not found`);
    const type = found.type as () => unknown;
    return {
      kind: found.relationType,
      type: type(),
      inverse: found.inverseSideProperty as
        ((entity: Record<string, unknown>) => unknown) | undefined,
    };
  };

  it('maps every entity to its table', () => {
    expect(tableOf(ProductOrmEntity)).toBe('products');
    expect(tableOf(CustomerOrmEntity)).toBe('customers');
    expect(tableOf(TransactionOrmEntity)).toBe('transactions');
    expect(tableOf(DeliveryOrmEntity)).toBe('deliveries');
  });

  it('uses the snake_case column names of the migrations', () => {
    expect(columnsOf(TransactionOrmEntity)).toMatchObject({
      productId: 'product_id',
      customerId: 'customer_id',
      idempotencyKey: 'idempotency_key',
      totalAmountInCents: 'total_amount_in_cents',
      gatewayTransactionId: 'gateway_transaction_id',
      cardLastFour: 'card_last_four',
    });
    expect(columnsOf(DeliveryOrmEntity)).toMatchObject({
      transactionId: 'transaction_id',
      addressLine1: 'address_line_1',
      postalCode: 'postal_code',
    });
  });

  it('a transaction belongs to a product and a customer', () => {
    expect(relation(TransactionOrmEntity, 'product')).toMatchObject({
      kind: 'many-to-one',
      type: ProductOrmEntity,
    });
    expect(relation(TransactionOrmEntity, 'customer')).toMatchObject({
      kind: 'many-to-one',
      type: CustomerOrmEntity,
    });
  });

  it('a transaction and its delivery are linked one to one, both ways', () => {
    const transactionSide = relation(TransactionOrmEntity, 'delivery');
    const deliverySide = relation(DeliveryOrmEntity, 'transaction');

    expect(transactionSide).toMatchObject({
      kind: 'one-to-one',
      type: DeliveryOrmEntity,
    });
    expect(deliverySide).toMatchObject({
      kind: 'one-to-one',
      type: TransactionOrmEntity,
    });

    const delivery = { transaction: 'tx' };
    const transaction = { delivery: 'del' };
    expect(transactionSide.inverse?.(delivery)).toBe('tx');
    expect(deliverySide.inverse?.(transaction)).toBe('del');
  });

  it('the delivery owns the foreign key (transaction_id)', () => {
    const joinColumn = storage.joinColumns.find(
      (column) =>
        column.target === DeliveryOrmEntity &&
        column.propertyName === 'transaction',
    );
    expect(joinColumn?.name).toBe('transaction_id');
  });
});
