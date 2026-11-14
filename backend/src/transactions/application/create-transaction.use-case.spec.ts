import { PaymentStatusPoller } from '../../payments/application/payment-status-poller';
import { GatewayTransaction } from '../../payments/domain/payment-gateway.port';
import { buildProduct } from '../../products/domain/product.fixture';
import { conflict, paymentGatewayError } from '../../shared/domain/app-error';
import { err, ok } from '../../shared/domain/result';
import { buildTransaction, TX_ID } from '../domain/transaction.fixture';
import {
  CreateTransactionCommand,
  CreateTransactionUseCase,
  PAYMENT_NOT_PROCESSED,
} from './create-transaction.use-case';
import {
  mockPaymentGateway,
  mockProductRepository,
  mockTransactionRepository,
} from './test-doubles.fixture';

const command = (
  overrides: Partial<CreateTransactionCommand> = {},
): CreateTransactionCommand => ({
  productId: 'prod-1',
  quantity: 2,
  idempotencyKey: null,
  customer: {
    fullName: '  Jane Doe ',
    email: ' Jane.Doe@Example.COM ',
    phone: ' 3001234567 ',
  },
  delivery: {
    addressLine1: 'Calle 10 # 20-30',
    addressLine2: null,
    city: 'Medellín',
    region: 'Antioquia',
    postalCode: null,
  },
  payment: {
    cardToken: 'tok_test',
    installments: 1,
    cardBrand: 'VISA',
    cardLastFour: '4242',
    acceptanceToken: 'acc',
    personalDataAuthToken: 'personal',
  },
  ...overrides,
});

const gatewayTx = (
  status: GatewayTransaction['status'],
): GatewayTransaction => ({
  id: 'gw-1',
  reference: 'ref-1',
  status,
  amountInCents: 2_300_000,
  statusMessage: status === 'DECLINED' ? 'Rejected' : null,
});

describe('CreateTransactionUseCase', () => {
  const products = mockProductRepository();
  const transactions = mockTransactionRepository();
  const gateway = mockPaymentGateway();
  const poller = { waitForFinalStatus: jest.fn() };
  const useCase = new CreateTransactionUseCase(
    products,
    transactions,
    gateway,
    poller as unknown as PaymentStatusPoller,
    { baseFeeInCents: 300_000, deliveryFeeInCents: 1_000_000 },
  );

  const pending = buildTransaction();

  beforeEach(() => {
    jest.resetAllMocks();
    products.findById.mockResolvedValue(
      buildProduct({ id: 'prod-1', priceInCents: 1_000_000, stock: 5 }),
    );
    transactions.createPending.mockResolvedValue(ok(pending));
    transactions.finalize.mockResolvedValue(true);
    transactions.attachGatewayTransaction.mockResolvedValue();
  });

  it('happy path: reserves, charges, waits and settles as APPROVED', async () => {
    const approved = buildTransaction({ status: 'APPROVED' });
    gateway.createCardPayment.mockResolvedValue(ok(gatewayTx('PENDING')));
    poller.waitForFinalStatus.mockResolvedValue(ok(gatewayTx('APPROVED')));
    transactions.findById.mockResolvedValue(approved);

    const result = await useCase.execute(command());

    expect(result.isOk && result.value).toBe(approved);

    const order = transactions.createPending.mock.calls[0][0];
    expect(order.customer).toEqual({
      fullName: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '3001234567',
    });
    expect(order.amounts.totalAmountInCents).toBe(3_300_000);
    expect(order.card).toEqual({ brand: 'VISA', lastFour: '4242' });

    expect(gateway.createCardPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: pending.reference,
        amountInCents: pending.amounts.totalAmountInCents,
        cardToken: 'tok_test',
        acceptanceToken: 'acc',
      }),
    );
    expect(transactions.attachGatewayTransaction).toHaveBeenCalledWith(
      TX_ID,
      'gw-1',
    );
    expect(transactions.finalize).toHaveBeenCalledWith(TX_ID, {
      status: 'APPROVED',
      statusMessage: null,
      deliveryStatus: 'ASSIGNED',
      releaseStock: false,
    });
  });

  it('settles as DECLINED and releases the stock', async () => {
    gateway.createCardPayment.mockResolvedValue(ok(gatewayTx('PENDING')));
    poller.waitForFinalStatus.mockResolvedValue(ok(gatewayTx('DECLINED')));
    transactions.findById.mockResolvedValue(
      buildTransaction({ status: 'DECLINED' }),
    );

    const result = await useCase.execute(command());

    expect(result.isOk && result.value.status).toBe('DECLINED');
    expect(transactions.finalize).toHaveBeenCalledWith(
      TX_ID,
      expect.objectContaining({
        releaseStock: true,
        statusMessage: 'Rejected',
      }),
    );
  });

  it('marks it as ERROR when the payment could not be created', async () => {
    gateway.createCardPayment.mockResolvedValue(
      err(paymentGatewayError('rejected')),
    );
    transactions.findById.mockResolvedValue(
      buildTransaction({ status: 'ERROR' }),
    );

    const result = await useCase.execute(command());

    expect(result.isOk && result.value.status).toBe('ERROR');
    expect(transactions.finalize).toHaveBeenCalledWith(TX_ID, {
      status: 'ERROR',
      statusMessage: PAYMENT_NOT_PROCESSED,
      deliveryStatus: 'CANCELLED',
      releaseStock: true,
    });
    expect(poller.waitForFinalStatus).not.toHaveBeenCalled();
  });

  it('keeps it PENDING when the result is not known yet', async () => {
    gateway.createCardPayment.mockResolvedValue(ok(gatewayTx('PENDING')));
    poller.waitForFinalStatus.mockResolvedValue(
      err(paymentGatewayError('down')),
    );
    transactions.findById.mockResolvedValue(
      buildTransaction({ gatewayTransactionId: 'gw-1' }),
    );

    const result = await useCase.execute(command());

    expect(result.isOk && result.value.status).toBe('PENDING');
    expect(transactions.finalize).not.toHaveBeenCalled();
  });

  it('does not settle when the poller times out with PENDING', async () => {
    gateway.createCardPayment.mockResolvedValue(ok(gatewayTx('PENDING')));
    poller.waitForFinalStatus.mockResolvedValue(ok(gatewayTx('PENDING')));
    transactions.findById.mockResolvedValue(pending);

    const result = await useCase.execute(command());

    expect(result.isOk && result.value.status).toBe('PENDING');
    expect(transactions.finalize).not.toHaveBeenCalled();
  });

  it('returns UNEXPECTED if the gateway id cannot be stored', async () => {
    gateway.createCardPayment.mockResolvedValue(ok(gatewayTx('PENDING')));
    transactions.attachGatewayTransaction.mockRejectedValue(new Error('db'));

    const result = await useCase.execute(command());

    expect(result.isErr && result.error.code).toBe('UNEXPECTED');
    expect(poller.waitForFinalStatus).not.toHaveBeenCalled();
  });

  describe('short circuits (railway)', () => {
    it('stops before reserving when the product is not available', async () => {
      products.findById.mockResolvedValue(buildProduct({ stock: 1 }));

      const result = await useCase.execute(command({ quantity: 2 }));

      expect(result.isErr && result.error.code).toBe('CONFLICT');
      expect(transactions.createPending).not.toHaveBeenCalled();
      expect(gateway.createCardPayment).not.toHaveBeenCalled();
    });

    it('stops before charging when the reservation fails', async () => {
      transactions.createPending.mockResolvedValue(
        err(conflict('The product ran out of stock')),
      );

      const result = await useCase.execute(command());

      expect(result.isErr && result.error.code).toBe('CONFLICT');
      expect(gateway.createCardPayment).not.toHaveBeenCalled();
    });

    it('returns UNEXPECTED when the reservation throws', async () => {
      transactions.createPending.mockRejectedValue(new Error('db down'));

      const result = await useCase.execute(command());

      expect(result.isErr && result.error.code).toBe('UNEXPECTED');
    });
  });

  describe('idempotency', () => {
    it('returns the original transaction for a repeated key, without charging', async () => {
      const original = buildTransaction({ status: 'APPROVED' });
      transactions.findByIdempotencyKey.mockResolvedValue(original);

      const result = await useCase.execute(command({ idempotencyKey: 'k-1' }));

      expect(result.isOk && result.value).toBe(original);
      expect(transactions.createPending).not.toHaveBeenCalled();
      expect(gateway.createCardPayment).not.toHaveBeenCalled();
    });

    it('processes a new key normally and stores it', async () => {
      transactions.findByIdempotencyKey.mockResolvedValue(null);
      gateway.createCardPayment.mockResolvedValue(ok(gatewayTx('PENDING')));
      poller.waitForFinalStatus.mockResolvedValue(ok(gatewayTx('APPROVED')));
      transactions.findById.mockResolvedValue(pending);

      await useCase.execute(command({ idempotencyKey: 'k-2' }));

      expect(transactions.createPending.mock.calls[0][0].idempotencyKey).toBe(
        'k-2',
      );
    });

    it('returns UNEXPECTED when the lookup fails', async () => {
      transactions.findByIdempotencyKey.mockRejectedValue(new Error('db'));

      const result = await useCase.execute(command({ idempotencyKey: 'k-3' }));

      expect(result.isErr && result.error.code).toBe('UNEXPECTED');
    });
  });
});
