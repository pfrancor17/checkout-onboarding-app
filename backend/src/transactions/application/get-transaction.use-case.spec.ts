import { Clock } from '../../payments/application/payment-status-poller';
import { GatewayTransaction } from '../../payments/domain/payment-gateway.port';
import {
  gatewayUnavailable,
  paymentGatewayError,
} from '../../shared/domain/app-error';
import { err, ok } from '../../shared/domain/result';
import {
  PAYMENT_NOT_PROCESSED,
  UNCONFIRMED_PAYMENT_GRACE_MS,
} from '../domain/transaction';
import { buildTransaction, TX_ID } from '../domain/transaction.fixture';
import { GetTransactionUseCase } from './get-transaction.use-case';
import {
  mockPaymentGateway,
  mockTransactionRepository,
} from './test-doubles.fixture';

const CREATED_AT = new Date('2026-01-01T00:00:00Z');

const gatewayTx = (
  status: GatewayTransaction['status'],
  statusMessage: string | null = null,
): GatewayTransaction => ({
  id: 'gw-1',
  reference: 'ref-1',
  status,
  amountInCents: 1,
  statusMessage,
});

describe('GetTransactionUseCase', () => {
  const transactions = mockTransactionRepository();
  const gateway = mockPaymentGateway();
  const now = jest.fn<number, []>();
  const clock: Clock = { now, sleep: jest.fn() };
  const useCase = new GetTransactionUseCase(transactions, gateway, clock);

  const minutesAfterCreation = (minutes: number) =>
    now.mockReturnValue(CREATED_AT.getTime() + minutes * 60_000);

  beforeEach(() => {
    jest.resetAllMocks();
    transactions.finalize.mockResolvedValue(true);
    transactions.attachGatewayTransaction.mockResolvedValue();
    minutesAfterCreation(0);
  });

  it('returns NOT_FOUND for an unknown transaction', async () => {
    transactions.findById.mockResolvedValue(null);

    const result = await useCase.execute(TX_ID);

    expect(result.isErr && result.error).toMatchObject({
      code: 'NOT_FOUND',
      message: `Transaction ${TX_ID} was not found`,
    });
  });

  it('returns UNEXPECTED when the repository fails', async () => {
    transactions.findById.mockRejectedValue(new Error('db'));

    const result = await useCase.execute(TX_ID);

    expect(result.isErr && result.error.code).toBe('UNEXPECTED');
  });

  it('returns a settled transaction without calling the gateway', async () => {
    const approved = buildTransaction({ status: 'APPROVED' });
    transactions.findById.mockResolvedValue(approved);

    const result = await useCase.execute(TX_ID);

    expect(result.isOk && result.value).toBe(approved);
    expect(gateway.getTransaction).not.toHaveBeenCalled();
    expect(gateway.findTransactionByReference).not.toHaveBeenCalled();
  });

  describe('PENDING with a gateway id', () => {
    const pending = buildTransaction({ gatewayTransactionId: 'gw-1' });

    it('settles it when the gateway already has a final status', async () => {
      const declined = buildTransaction({ status: 'DECLINED' });
      transactions.findById
        .mockResolvedValueOnce(pending)
        .mockResolvedValueOnce(declined);
      gateway.getTransaction.mockResolvedValue(
        ok(gatewayTx('DECLINED', 'Rejected')),
      );

      const result = await useCase.execute(TX_ID);

      expect(result.isOk && result.value).toBe(declined);
      expect(gateway.getTransaction).toHaveBeenCalledWith('gw-1');
      expect(transactions.finalize).toHaveBeenCalledWith(TX_ID, {
        status: 'DECLINED',
        statusMessage: 'Rejected',
        deliveryStatus: 'CANCELLED',
        releaseStock: true,
      });
    });

    it('keeps it PENDING while the gateway is still processing', async () => {
      transactions.findById.mockResolvedValue(pending);
      gateway.getTransaction.mockResolvedValue(ok(gatewayTx('PENDING')));

      const result = await useCase.execute(TX_ID);

      expect(result.isOk && result.value.status).toBe('PENDING');
      expect(transactions.finalize).not.toHaveBeenCalled();
    });

    it('keeps it PENDING when the gateway is unreachable', async () => {
      transactions.findById.mockResolvedValue(pending);
      gateway.getTransaction.mockResolvedValue(
        err(gatewayUnavailable('timeout')),
      );

      const result = await useCase.execute(TX_ID);

      expect(result.isOk && result.value).toBe(pending);
    });

    it('returns UNEXPECTED when settling fails', async () => {
      transactions.findById.mockResolvedValue(pending);
      transactions.finalize.mockRejectedValue(new Error('db'));
      gateway.getTransaction.mockResolvedValue(ok(gatewayTx('APPROVED')));

      const result = await useCase.execute(TX_ID);

      expect(result.isErr && result.error.code).toBe('UNEXPECTED');
    });
  });

  describe('PENDING without a gateway id (the gateway did not answer)', () => {
    const unconfirmed = buildTransaction({ createdAt: CREATED_AT });

    it('finds it by reference, stores the gateway id and settles it', async () => {
      const approved = buildTransaction({ status: 'APPROVED' });
      transactions.findById
        .mockResolvedValueOnce(unconfirmed)
        .mockResolvedValueOnce(approved);
      gateway.findTransactionByReference.mockResolvedValue(
        ok(gatewayTx('APPROVED')),
      );

      const result = await useCase.execute(TX_ID);

      expect(gateway.findTransactionByReference).toHaveBeenCalledWith('ref-1');
      expect(transactions.attachGatewayTransaction).toHaveBeenCalledWith(
        TX_ID,
        'gw-1',
      );
      expect(transactions.finalize).toHaveBeenCalledWith(
        TX_ID,
        expect.objectContaining({ status: 'APPROVED', releaseStock: false }),
      );
      expect(result.isOk && result.value).toBe(approved);
    });

    it('waits during the grace period if the gateway does not know it yet', async () => {
      transactions.findById.mockResolvedValue(unconfirmed);
      gateway.findTransactionByReference.mockResolvedValue(ok(null));
      minutesAfterCreation(1);

      const result = await useCase.execute(TX_ID);

      expect(result.isOk && result.value.status).toBe('PENDING');
      expect(transactions.finalize).not.toHaveBeenCalled();
    });

    it('marks it as ERROR and releases the stock after the grace period', async () => {
      transactions.findById.mockResolvedValue(unconfirmed);
      gateway.findTransactionByReference.mockResolvedValue(ok(null));
      minutesAfterCreation(UNCONFIRMED_PAYMENT_GRACE_MS / 60_000 + 1);

      await useCase.execute(TX_ID);

      expect(transactions.finalize).toHaveBeenCalledWith(TX_ID, {
        status: 'ERROR',
        statusMessage: PAYMENT_NOT_PROCESSED,
        deliveryStatus: 'CANCELLED',
        releaseStock: true,
      });
    });

    it('keeps it PENDING when the reference lookup fails', async () => {
      transactions.findById.mockResolvedValue(unconfirmed);
      gateway.findTransactionByReference.mockResolvedValue(
        err(paymentGatewayError('rejected')),
      );
      minutesAfterCreation(60);

      const result = await useCase.execute(TX_ID);

      expect(result.isOk && result.value.status).toBe('PENDING');
      expect(transactions.finalize).not.toHaveBeenCalled();
    });

    it('returns UNEXPECTED if the gateway id cannot be stored', async () => {
      transactions.findById.mockResolvedValue(unconfirmed);
      transactions.attachGatewayTransaction.mockRejectedValue(new Error('db'));
      gateway.findTransactionByReference.mockResolvedValue(
        ok(gatewayTx('APPROVED')),
      );

      const result = await useCase.execute(TX_ID);

      expect(result.isErr && result.error.code).toBe('UNEXPECTED');
      expect(transactions.finalize).not.toHaveBeenCalled();
    });
  });
});
