import { paymentGatewayError } from '../../shared/domain/app-error';
import { err, ok } from '../../shared/domain/result';
import { buildTransaction, TX_ID } from '../domain/transaction.fixture';
import { GetTransactionUseCase } from './get-transaction.use-case';
import {
  mockPaymentGateway,
  mockTransactionRepository,
} from './test-doubles.fixture';

describe('GetTransactionUseCase', () => {
  const transactions = mockTransactionRepository();
  const gateway = mockPaymentGateway();
  const useCase = new GetTransactionUseCase(transactions, gateway);

  beforeEach(() => jest.resetAllMocks());

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
  });

  it('does not sync a PENDING transaction that never reached the gateway', async () => {
    transactions.findById.mockResolvedValue(buildTransaction());

    await useCase.execute(TX_ID);

    expect(gateway.getTransaction).not.toHaveBeenCalled();
  });

  describe('PENDING with a gateway id', () => {
    const pending = buildTransaction({ gatewayTransactionId: 'gw-1' });

    it('settles it when the gateway already has a final status', async () => {
      const declined = buildTransaction({ status: 'DECLINED' });
      transactions.findById
        .mockResolvedValueOnce(pending)
        .mockResolvedValueOnce(declined);
      transactions.finalize.mockResolvedValue(true);
      gateway.getTransaction.mockResolvedValue(
        ok({
          id: 'gw-1',
          reference: 'ref-1',
          status: 'DECLINED',
          amountInCents: 1,
          statusMessage: 'Rejected',
        }),
      );

      const result = await useCase.execute(TX_ID);

      expect(result.isOk && result.value).toBe(declined);
      expect(transactions.finalize).toHaveBeenCalledWith(TX_ID, {
        status: 'DECLINED',
        statusMessage: 'Rejected',
        deliveryStatus: 'CANCELLED',
        releaseStock: true,
      });
    });

    it('keeps it PENDING while the gateway is still processing', async () => {
      transactions.findById.mockResolvedValue(pending);
      gateway.getTransaction.mockResolvedValue(
        ok({
          id: 'gw-1',
          reference: 'ref-1',
          status: 'PENDING',
          amountInCents: 1,
          statusMessage: null,
        }),
      );

      const result = await useCase.execute(TX_ID);

      expect(result.isOk && result.value).toBe(pending);
      expect(transactions.finalize).not.toHaveBeenCalled();
    });

    it('keeps it PENDING when the gateway is unreachable', async () => {
      transactions.findById.mockResolvedValue(pending);
      gateway.getTransaction.mockResolvedValue(
        err(paymentGatewayError('down')),
      );

      const result = await useCase.execute(TX_ID);

      expect(result.isOk && result.value).toBe(pending);
    });

    it('returns UNEXPECTED when settling fails', async () => {
      transactions.findById.mockResolvedValue(pending);
      transactions.finalize.mockRejectedValue(new Error('db'));
      gateway.getTransaction.mockResolvedValue(
        ok({
          id: 'gw-1',
          reference: 'ref-1',
          status: 'APPROVED',
          amountInCents: 1,
          statusMessage: null,
        }),
      );

      const result = await useCase.execute(TX_ID);

      expect(result.isErr && result.error.code).toBe('UNEXPECTED');
    });
  });
});
