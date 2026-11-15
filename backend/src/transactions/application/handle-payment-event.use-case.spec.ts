import { Logger } from '@nestjs/common';
import { PaymentEvent } from '../../payments/domain/payment-event';
import { buildTransaction, TX_ID } from '../domain/transaction.fixture';
import { HandlePaymentEventUseCase } from './handle-payment-event.use-case';
import { mockTransactionRepository } from './test-doubles.fixture';

const event = (overrides: Partial<PaymentEvent> = {}): PaymentEvent => ({
  gatewayTransactionId: 'gw-1',
  reference: 'ref-1',
  status: 'APPROVED',
  amountInCents: 2_300_000,
  statusMessage: null,
  ...overrides,
});

describe('HandlePaymentEventUseCase', () => {
  const transactions = mockTransactionRepository();
  const useCase = new HandlePaymentEventUseCase(transactions);

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    transactions.finalize.mockResolvedValue(true);
    transactions.attachGatewayTransaction.mockResolvedValue();
  });

  it('settles a PENDING transaction and stores the gateway id', async () => {
    transactions.findByReference.mockResolvedValue(buildTransaction());

    const result = await useCase.execute(event());

    expect(result.isOk && result.value).toBe('SETTLED');
    expect(transactions.findByReference).toHaveBeenCalledWith('ref-1');
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

  it('releases the stock when the event says the payment was declined', async () => {
    transactions.findByReference.mockResolvedValue(
      buildTransaction({ gatewayTransactionId: 'gw-1' }),
    );

    await useCase.execute(event({ status: 'DECLINED', statusMessage: 'No' }));

    expect(transactions.attachGatewayTransaction).not.toHaveBeenCalled();
    expect(transactions.finalize).toHaveBeenCalledWith(
      TX_ID,
      expect.objectContaining({ status: 'DECLINED', releaseStock: true }),
    );
  });

  it('only stores the gateway id while the payment is still PENDING', async () => {
    transactions.findByReference.mockResolvedValue(buildTransaction());

    const result = await useCase.execute(event({ status: 'PENDING' }));

    expect(result.isOk && result.value).toBe('STILL_PENDING');
    expect(transactions.attachGatewayTransaction).toHaveBeenCalled();
    expect(transactions.finalize).not.toHaveBeenCalled();
  });

  it('does nothing for an already settled transaction (repeated event)', async () => {
    transactions.findByReference.mockResolvedValue(
      buildTransaction({ status: 'APPROVED' }),
    );

    const result = await useCase.execute(event());

    expect(result.isOk && result.value).toBe('ALREADY_SETTLED');
    expect(transactions.finalize).not.toHaveBeenCalled();
  });

  it('reports ALREADY_SETTLED when another process won the race', async () => {
    transactions.findByReference.mockResolvedValue(buildTransaction());
    transactions.finalize.mockResolvedValue(false);

    const result = await useCase.execute(event());

    expect(result.isOk && result.value).toBe('ALREADY_SETTLED');
  });

  it('ignores an unknown reference', async () => {
    transactions.findByReference.mockResolvedValue(null);

    const result = await useCase.execute(event());

    expect(result.isOk && result.value).toBe('IGNORED_UNKNOWN_REFERENCE');
  });

  it('never settles a payment for a different amount', async () => {
    transactions.findByReference.mockResolvedValue(buildTransaction());

    const result = await useCase.execute(event({ amountInCents: 100 }));

    expect(result.isOk && result.value).toBe('IGNORED_AMOUNT_MISMATCH');
    expect(transactions.finalize).not.toHaveBeenCalled();
  });

  it('returns UNEXPECTED when the repository fails', async () => {
    transactions.findByReference.mockRejectedValue(new Error('db down'));

    const result = await useCase.execute(event());

    expect(result.isErr && result.error.code).toBe('UNEXPECTED');
  });

  it('returns UNEXPECTED when settling fails', async () => {
    transactions.findByReference.mockResolvedValue(buildTransaction());
    transactions.finalize.mockRejectedValue(new Error('db down'));

    const result = await useCase.execute(event());

    expect(result.isErr && result.error.code).toBe('UNEXPECTED');
  });
});
