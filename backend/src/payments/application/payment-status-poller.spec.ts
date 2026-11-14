import { paymentGatewayError } from '../../shared/domain/app-error';
import { err, ok } from '../../shared/domain/result';
import {
  GatewayTransaction,
  PaymentGateway,
  PaymentStatus,
} from '../domain/payment-gateway.port';
import { defaultSleep, PaymentStatusPoller } from './payment-status-poller';

const tx = (status: PaymentStatus): GatewayTransaction => ({
  id: 'gw-1',
  reference: 'ref-1',
  status,
  amountInCents: 1000,
  statusMessage: null,
});

describe('PaymentStatusPoller', () => {
  const gateway: jest.Mocked<PaymentGateway> = {
    getAcceptanceTokens: jest.fn(),
    createCardPayment: jest.fn(),
    getTransaction: jest.fn(),
  };
  const sleep = jest.fn().mockResolvedValue(undefined);
  const poller = new PaymentStatusPoller(
    gateway,
    { attempts: 3, intervalMs: 500 },
    sleep,
  );

  beforeEach(() => {
    gateway.getTransaction.mockReset();
    sleep.mockClear();
  });

  it('returns as soon as the status is final', async () => {
    gateway.getTransaction
      .mockResolvedValueOnce(ok(tx('PENDING')))
      .mockResolvedValueOnce(ok(tx('APPROVED')));

    const result = await poller.waitForFinalStatus('gw-1');

    expect(result.isOk && result.value.status).toBe('APPROVED');
    expect(gateway.getTransaction).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it('returns the PENDING transaction when attempts run out', async () => {
    gateway.getTransaction.mockResolvedValue(ok(tx('PENDING')));

    const result = await poller.waitForFinalStatus('gw-1');

    expect(result.isOk && result.value.status).toBe('PENDING');
    expect(gateway.getTransaction).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('retries a transient gateway error', async () => {
    gateway.getTransaction
      .mockResolvedValueOnce(err(paymentGatewayError('timeout')))
      .mockResolvedValueOnce(ok(tx('DECLINED')));

    const result = await poller.waitForFinalStatus('gw-1');

    expect(result.isOk && result.value.status).toBe('DECLINED');
  });

  it('returns the error if the gateway keeps failing', async () => {
    gateway.getTransaction.mockResolvedValue(err(paymentGatewayError('down')));

    const result = await poller.waitForFinalStatus('gw-1');

    expect(result.isErr && result.error.code).toBe('PAYMENT_GATEWAY');
  });

  it('defaultSleep waits the given time', async () => {
    jest.useFakeTimers();
    const promise = defaultSleep(1000);
    jest.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
    jest.useRealTimers();
  });
});
