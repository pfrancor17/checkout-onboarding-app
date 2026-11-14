import 'dotenv/config';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from '../src/config/database.config';
import { CustomerOrmEntity } from '../src/customers/infrastructure/persistence/customer.orm-entity';
import { DeliveryOrmEntity } from '../src/deliveries/infrastructure/persistence/delivery.orm-entity';
import { ProductOrmEntity } from '../src/products/infrastructure/persistence/product.orm-entity';
import { buildOrder } from '../src/transactions/domain/transaction.fixture';
import { resolvePayment } from '../src/transactions/domain/transaction';
import { TransactionOrmEntity } from '../src/transactions/infrastructure/persistence/transaction.orm-entity';
import { TypeOrmTransactionRepository } from '../src/transactions/infrastructure/persistence/typeorm-transaction.repository';

/**
 * Runs the transaction repository against a real PostgreSQL database
 * (docker compose locally, a service container in CI).
 * Uses its own test product so it never touches the seeded ones.
 */
describe('TypeOrmTransactionRepository (PostgreSQL)', () => {
  let dataSource: DataSource;
  let repository: TypeOrmTransactionRepository;
  let productId: string;

  const stock = async () =>
    (
      await dataSource.manager.findOneByOrFail(ProductOrmEntity, {
        id: productId,
      })
    ).stock;

  const order = (quantity = 1, overrides = {}) =>
    buildOrder({
      productId,
      reference: randomUUID(),
      amounts: { ...buildOrder().amounts, quantity },
      customer: {
        fullName: 'Integration Test',
        email: `int-${randomUUID()}@example.com`,
        phone: '3000000000',
      },
      ...overrides,
    });

  beforeAll(async () => {
    dataSource = new DataSource({
      ...buildDatabaseOptions(process.env),
      entities: [
        ProductOrmEntity,
        CustomerOrmEntity,
        TransactionOrmEntity,
        DeliveryOrmEntity,
      ],
    });
    await dataSource.initialize();
    repository = new TypeOrmTransactionRepository(dataSource);
  });

  beforeEach(async () => {
    const product = await dataSource.manager.save(
      dataSource.manager.create(ProductOrmEntity, {
        sku: `INT-${randomUUID().slice(0, 8)}`,
        name: 'Integration product',
        description: 'Only for integration tests',
        priceInCents: 1_000_000,
        currency: 'COP',
        stock: 2,
        imageUrl: null,
      }),
    );
    productId = product.id;
  });

  afterEach(async () => {
    await dataSource.query(
      `DELETE FROM "transactions" WHERE "product_id" = $1`,
      [productId],
    );
    await dataSource.query(`DELETE FROM "products" WHERE "id" = $1`, [
      productId,
    ]);
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM "customers" WHERE "email" LIKE 'int-%@example.com'`,
    );
    await dataSource.destroy();
  });

  it('creates a PENDING transaction with its delivery and reserves the stock', async () => {
    const result = await repository.createPending(order(2));

    expect(result.isOk).toBe(true);
    const tx = result.isOk ? result.value : null;
    expect(tx).toMatchObject({
      status: 'PENDING',
      product: { id: productId },
      delivery: { status: 'PENDING', city: 'Medellín' },
    });
    expect(await stock()).toBe(0);
  });

  it('never sells more units than available, even with concurrent orders', async () => {
    const results = await Promise.all([
      repository.createPending(order(1)),
      repository.createPending(order(1)),
      repository.createPending(order(1)),
    ]);

    const created = results.filter((r) => r.isOk).length;
    const rejected = results.filter(
      (r) => r.isErr && r.error.code === 'CONFLICT',
    ).length;
    expect(created).toBe(2);
    expect(rejected).toBe(1);
    expect(await stock()).toBe(0);
  });

  it('releases the stock and cancels the delivery when the payment fails', async () => {
    const created = await repository.createPending(order(2));
    const id = created.isOk ? created.value.id : '';

    const settled = await repository.finalize(
      id,
      resolvePayment('DECLINED', 'Rejected')!,
    );

    expect(settled).toBe(true);
    expect(await stock()).toBe(2);
    expect(await repository.findById(id)).toMatchObject({
      status: 'DECLINED',
      statusMessage: 'Rejected',
      delivery: { status: 'CANCELLED' },
    });
  });

  it('keeps the stock sold and assigns the delivery when approved', async () => {
    const created = await repository.createPending(order(1));
    const id = created.isOk ? created.value.id : '';

    await repository.finalize(id, resolvePayment('APPROVED', null)!);

    expect(await stock()).toBe(1);
    expect(await repository.findById(id)).toMatchObject({
      status: 'APPROVED',
      delivery: { status: 'ASSIGNED' },
    });
  });

  it('settles a transaction only once (no double stock release)', async () => {
    const created = await repository.createPending(order(1));
    const id = created.isOk ? created.value.id : '';
    const declined = resolvePayment('DECLINED', null)!;

    const [first, second] = await Promise.all([
      repository.finalize(id, declined),
      repository.finalize(id, declined),
    ]);

    expect([first, second].sort()).toEqual([false, true]);
    expect(await stock()).toBe(2);
  });

  it('finds a transaction by idempotency key and rejects a duplicate key', async () => {
    const key = `int-key-${randomUUID()}`;
    await repository.createPending(order(1, { idempotencyKey: key }));

    expect(await repository.findByIdempotencyKey(key)).toMatchObject({
      status: 'PENDING',
    });

    const duplicate = await repository.createPending(
      order(1, { idempotencyKey: key }),
    );
    expect(duplicate.isErr && duplicate.error.code).toBe('CONFLICT');
    expect(await stock()).toBe(1);
  });

  it('reuses the customer when the same email buys again', async () => {
    const email = `int-${randomUUID()}@example.com`;
    const customer = {
      fullName: 'Repeat Buyer',
      email,
      phone: '3000000000',
    };
    const first = await repository.createPending(order(1, { customer }));
    const second = await repository.createPending(
      order(1, { customer: { ...customer, phone: '3111111111' } }),
    );

    const firstCustomer = first.isOk ? first.value.customer : null;
    const secondCustomer = second.isOk ? second.value.customer : null;
    expect(secondCustomer?.id).toBe(firstCustomer?.id);
    expect(secondCustomer?.phone).toBe('3111111111');
  });
});
