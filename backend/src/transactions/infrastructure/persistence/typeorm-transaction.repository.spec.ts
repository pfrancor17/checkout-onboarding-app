import { DataSource, EntityManager } from 'typeorm';
import { buildOrder, TX_ID } from '../../domain/transaction.fixture';
import { TransactionOrmEntity } from './transaction.orm-entity';
import { TypeOrmTransactionRepository } from './typeorm-transaction.repository';

const loadedEntity = (
  overrides: Partial<TransactionOrmEntity> = {},
): TransactionOrmEntity =>
  Object.assign(new TransactionOrmEntity(), {
    id: TX_ID,
    reference: 'ref-1',
    idempotencyKey: null,
    productId: 'prod-1',
    customerId: 'cust-1',
    quantity: 1,
    unitPriceInCents: 1_000_000,
    productAmountInCents: 1_000_000,
    baseFeeInCents: 300_000,
    deliveryFeeInCents: 1_000_000,
    totalAmountInCents: 2_300_000,
    currency: 'COP',
    status: 'PENDING',
    statusMessage: null,
    gatewayTransactionId: null,
    cardBrand: 'VISA',
    cardLastFour: '4242',
    createdAt: new Date(),
    updatedAt: new Date(),
    product: { id: 'prod-1', name: 'Speaker' },
    customer: {
      id: 'cust-1',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '3001234567',
    },
    delivery: {
      id: 'del-1',
      status: 'PENDING',
      addressLine1: 'Calle 10',
      addressLine2: null,
      city: 'Medellín',
      region: 'Antioquia',
      postalCode: null,
    },
    ...overrides,
  });

describe('TypeOrmTransactionRepository', () => {
  const manager = {
    decrement: jest.fn(),
    increment: jest.fn(),
    upsert: jest.fn(),
    findOneByOrFail: jest.fn(),
    create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  };
  const dataSource = {
    manager,
    transaction: jest.fn((work: (m: EntityManager) => Promise<unknown>) =>
      work(manager as unknown as EntityManager),
    ),
  };
  const repository = new TypeOrmTransactionRepository(
    dataSource as unknown as DataSource,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    manager.findOne.mockResolvedValue(loadedEntity());
  });

  describe('createPending', () => {
    beforeEach(() => {
      manager.decrement.mockResolvedValue({ affected: 1 });
      manager.findOneByOrFail.mockResolvedValue({ id: 'cust-1' });
      manager.save
        .mockResolvedValueOnce({ id: TX_ID })
        .mockResolvedValueOnce({ id: 'del-1' });
    });

    it('reserves stock, upserts the customer and stores transaction + delivery', async () => {
      const order = buildOrder({ idempotencyKey: 'k-1' });

      const result = await repository.createPending(order);

      expect(result.isOk && result.value.id).toBe(TX_ID);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(manager.decrement).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: order.productId }),
        'stock',
        1,
      );
      expect(manager.upsert).toHaveBeenCalledWith(
        expect.anything(),
        order.customer,
        ['email'],
      );
      expect(manager.save).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          reference: 'ref-1',
          idempotencyKey: 'k-1',
          customerId: 'cust-1',
          status: 'PENDING',
          totalAmountInCents: 2_300_000,
          cardLastFour: '4242',
        }),
      );
      expect(manager.save).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          transactionId: TX_ID,
          recipientName: 'Jane Doe',
          phone: '3001234567',
          status: 'PENDING',
        }),
      );
    });

    it('returns CONFLICT and writes nothing when the stock ran out', async () => {
      manager.decrement.mockResolvedValue({ affected: 0 });

      const result = await repository.createPending(buildOrder());

      expect(result.isErr && result.error).toMatchObject({
        code: 'CONFLICT',
        message: 'The product ran out of stock',
      });
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('returns CONFLICT when the idempotency key is already used', async () => {
      manager.save.mockReset().mockRejectedValue({
        code: '23505',
        detail: 'Key (idempotency_key)=(k-1) already exists.',
      });

      const result = await repository.createPending(buildOrder());

      expect(result.isErr && result.error.code).toBe('CONFLICT');
    });

    it('rethrows any other database error', async () => {
      manager.save.mockReset().mockRejectedValue(new Error('connection lost'));

      await expect(repository.createPending(buildOrder())).rejects.toThrow(
        'connection lost',
      );
    });

    it('fails loudly if the row cannot be read back', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(repository.createPending(buildOrder())).rejects.toThrow(
        'vanished',
      );
    });
  });

  describe('reads', () => {
    it('findById maps the entity with its relations', async () => {
      const found = await repository.findById(TX_ID);

      expect(manager.findOne).toHaveBeenCalledWith(TransactionOrmEntity, {
        where: { id: TX_ID },
        relations: { product: true, customer: true, delivery: true },
      });
      expect(found).toMatchObject({
        id: TX_ID,
        product: { id: 'prod-1', name: 'Speaker' },
        customer: { email: 'jane@example.com' },
        delivery: { id: 'del-1', status: 'PENDING' },
        card: { brand: 'VISA', lastFour: '4242' },
        amounts: { totalAmountInCents: 2_300_000 },
      });
    });

    it('findByIdempotencyKey filters by key', async () => {
      await repository.findByIdempotencyKey('k-1');

      expect(manager.findOne).toHaveBeenCalledWith(
        TransactionOrmEntity,
        expect.objectContaining({ where: { idempotencyKey: 'k-1' } }),
      );
    });

    it('returns null when nothing is found', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(repository.findById('x')).resolves.toBeNull();
    });

    it('throws if the relations were not loaded', async () => {
      manager.findOne.mockResolvedValue(loadedEntity({ delivery: undefined }));

      await expect(repository.findById(TX_ID)).rejects.toThrow(
        'must be loaded with product, customer and delivery',
      );
    });
  });

  it('attachGatewayTransaction stores the gateway id', async () => {
    await repository.attachGatewayTransaction(TX_ID, 'gw-1');

    expect(manager.update).toHaveBeenCalledWith(
      TransactionOrmEntity,
      { id: TX_ID },
      { gatewayTransactionId: 'gw-1' },
    );
  });

  describe('finalize', () => {
    it('settles a PENDING transaction and keeps the stock when approved', async () => {
      manager.update.mockResolvedValue({ affected: 1 });

      const settled = await repository.finalize(TX_ID, {
        status: 'APPROVED',
        statusMessage: null,
        deliveryStatus: 'ASSIGNED',
        releaseStock: false,
      });

      expect(settled).toBe(true);
      expect(manager.update).toHaveBeenNthCalledWith(
        1,
        TransactionOrmEntity,
        { id: TX_ID, status: 'PENDING' },
        { status: 'APPROVED', statusMessage: null },
      );
      expect(manager.update).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        { transactionId: TX_ID },
        { status: 'ASSIGNED' },
      );
      expect(manager.increment).not.toHaveBeenCalled();
    });

    it('returns the reserved units when the payment failed', async () => {
      manager.update.mockResolvedValue({ affected: 1 });
      manager.findOneByOrFail.mockResolvedValue({
        productId: 'prod-1',
        quantity: 2,
      });

      await repository.finalize(TX_ID, {
        status: 'DECLINED',
        statusMessage: 'x'.repeat(300),
        deliveryStatus: 'CANCELLED',
        releaseStock: true,
      });

      expect(manager.update).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.anything(),
        { status: 'DECLINED', statusMessage: 'x'.repeat(255) },
      );
      expect(manager.increment).toHaveBeenCalledWith(
        expect.anything(),
        { id: 'prod-1' },
        'stock',
        2,
      );
    });

    it('does nothing if the transaction was already settled', async () => {
      manager.update.mockResolvedValue({ affected: 0 });

      const settled = await repository.finalize(TX_ID, {
        status: 'DECLINED',
        statusMessage: null,
        deliveryStatus: 'CANCELLED',
        releaseStock: true,
      });

      expect(settled).toBe(false);
      expect(manager.update).toHaveBeenCalledTimes(1);
      expect(manager.increment).not.toHaveBeenCalled();
    });
  });
});
