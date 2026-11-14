import { paymentGatewayError } from '../../shared/domain/app-error';
import { err, ok } from '../../shared/domain/result';
import {
  GatewayTransaction,
  PaymentGateway,
  PaymentStatus,
} from '../domain/payment-gateway.port';
import {
  Clock,
  PaymentPollingConfig,
  PaymentStatusPoller,
  systemClock,
} from './payment-status-poller';

const tx = (status: PaymentStatus): GatewayTransaction => ({
  id: 'gw-1',
  reference: 'ref-1',
  status,
  amountInCents: 1000,
  statusMessage: null,
});

/** Fake clock: time only moves when the poller sleeps or a call is slow. */
class FakeClock implements Clock {
  current = 0;
  sleeps: number[] = [];
  now = (): number => this.current;
  sleep = (ms: number): Promise<void> => {
    this.sleeps.push(ms);
    this.current += ms;
    return Promise.resolve();
  };
}

describe('PaymentStatusPoller', () => {
  const gateway: jest.Mocked<PaymentGateway> = {
    getAcceptanceTokens: jest.fn(),
    createCardPayment: jest.fn(),
    getTransaction: jest.fn(),
  };
  let clock: FakeClock;

  const buildPoller = (overrides: Partial<PaymentPollingConfig> = {}) =>
    new PaymentStatusPoller(
      gateway,
      { attempts: 3, intervalMs: 500, maxWaitMs: 60_000, ...overrides },
      clock,
    );

  beforeEach(() => {
    gateway.getTransaction.mockReset();
    clock = new FakeClock();
  });

  it('returns as soon as the status is final', async () => {
    gateway.getTransaction
      .mockResolvedValueOnce(ok(tx('PENDING')))
      .mockResolvedValueOnce(ok(tx('APPROVED')));

    const result = await buildPoller().waitForFinalStatus('gw-1');

    expect(result.isOk && result.value.status).toBe('APPROVED');
    expect(gateway.getTransaction).toHaveBeenCalledTimes(2);
    expect(clock.sleeps).toEqual([500]);
  });

  it('returns the PENDING transaction when attempts run out', async () => {
    gateway.getTransaction.mockResolvedValue(ok(tx('PENDING')));

    const result = await buildPoller().waitForFinalStatus('gw-1');

    expect(result.isOk && result.value.status).toBe('PENDING');
    expect(gateway.getTransaction).toHaveBeenCalledTimes(3);
    expect(clock.sleeps).toEqual([500, 500]);
  });

  it('stops when the time budget is spent, even with attempts left', async () => {
    // Each gateway call is slow: 4 s.
    gateway.getTransaction.mockImplementation(() => {
      clock.current += 4_000;
      return Promise.resolve(ok(tx('PENDING')));
    });

    const result = await buildPoller({
      attempts: 10,
      intervalMs: 2_000,
      maxWaitMs: 15_000,
    }).waitForFinalStatus('gw-1');

    expect(result.isOk && result.value.status).toBe('PENDING');
    // t=4 sleep→6, t=10 sleep→12, t=16 stop: 3 calls instead of 10.
    expect(gateway.getTransaction).toHaveBeenCalledTimes(3);
    expect(clock.current).toBeLessThanOrEqual(15_000 + 4_000);
  });

  it('retries a transient gateway error', async () => {
    gateway.getTransaction
      .mockResolvedValueOnce(err(paymentGatewayError('timeout')))
      .mockResolvedValueOnce(ok(tx('DECLINED')));

    const result = await buildPoller().waitForFinalStatus('gw-1');

    expect(result.isOk && result.value.status).toBe('DECLINED');
  });

  it('returns the error if the gateway keeps failing', async () => {
    gateway.getTransaction.mockResolvedValue(err(paymentGatewayError('down')));

    const result = await buildPoller().waitForFinalStatus('gw-1');

    expect(result.isErr && result.error.code).toBe('PAYMENT_GATEWAY');
  });

  describe('systemClock', () => {
    it('now() returns the current time', () => {
      expect(Math.abs(systemClock.now() - Date.now())).toBeLessThan(50);
    });

    it('sleep() waits the given time', async () => {
      jest.useFakeTimers();
      const promise = systemClock.sleep(1000);
      jest.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
      jest.useRealTimers();
    });
  });
});
