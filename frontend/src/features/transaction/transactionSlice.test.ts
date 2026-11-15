import { setupStore } from '../../app/store';
import { summaryCheckoutState } from '../../test/checkoutState.fixture';
import { ApiError, apiRequest } from '../../shared/api/httpClient';
import { checkoutFinished } from '../checkout/checkoutSlice';
import { initialPaymentState } from '../payment/paymentSlice';
import { initialSummaryState } from '../summary/summarySlice';
import { buildTransaction } from './transaction.fixture';
import {
  initialTransactionState,
  PAY_ERROR_MESSAGE,
  payTransaction,
} from './transactionSlice';

jest.mock('../../shared/api/httpClient', () => ({
  ...jest.requireActual('../../shared/api/httpClient'),
  apiRequest: jest.fn(),
}));
const apiRequestMock = jest.mocked(apiRequest);

const storeOnSummary = (checkout = summaryCheckoutState()) =>
  setupStore({
    checkout,
    payment: { ...initialPaymentState, cardToken: 'tok_test_1' },
    summary: {
      ...initialSummaryState,
      termsAccepted: true,
      personalDataAccepted: true,
      acceptance: {
        status: 'succeeded',
        error: null,
        data: {
          acceptanceToken: 'acc',
          termsUrl: 'https://t',
          personalDataAuthToken: 'personal',
          personalDataPolicyUrl: 'https://p',
        },
      },
    },
  });

describe('payTransaction', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('creates the transaction with the checkout data and moves to the result', async () => {
    const transaction = buildTransaction();
    apiRequestMock.mockResolvedValue(transaction);
    const store = storeOnSummary();

    await store.dispatch(payTransaction());

    const [path, init] = apiRequestMock.mock.calls[0];
    expect(path).toBe('/transactions');
    expect(init?.method).toBe('POST');
    const key = store.getState().checkout.idempotencyKey;
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(init?.headers).toEqual({ 'Idempotency-Key': key });
    expect(JSON.parse(init?.body as string)).toEqual({
      productId: 'prod-1',
      quantity: 2,
      customer: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '3001234567',
      },
      delivery: {
        addressLine1: 'Calle 10 # 20-30',
        city: 'Medellín',
        region: 'Antioquia',
        postalCode: '050021',
      },
      payment: {
        cardToken: 'tok_test_1',
        installments: 3,
        cardBrand: 'VISA',
        cardLastFour: '4242',
        acceptanceToken: 'acc',
        personalDataAuthToken: 'personal',
      },
    });
    expect(store.getState().transaction).toMatchObject({
      status: 'succeeded',
      current: transaction,
    });
    expect(store.getState().checkout).toMatchObject({
      step: 'RESULT',
      transactionId: 'tx-1',
    });
  });

  it('reuses the same Idempotency-Key when retrying after an error', async () => {
    apiRequestMock
      .mockRejectedValueOnce(new ApiError(0, 'Sin conexión'))
      .mockResolvedValueOnce(buildTransaction());
    const store = storeOnSummary();

    await store.dispatch(payTransaction());
    expect(store.getState().transaction).toMatchObject({
      status: 'failed',
      error: 'Sin conexión',
      errorStatus: 0,
    });
    await store.dispatch(payTransaction());

    const firstKey = (
      apiRequestMock.mock.calls[0][1]?.headers as Record<string, string>
    )['Idempotency-Key'];
    const secondKey = (
      apiRequestMock.mock.calls[1][1]?.headers as Record<string, string>
    )['Idempotency-Key'];
    expect(secondKey).toBe(firstKey);
  });

  it('keeps an Idempotency-Key restored after a refresh', async () => {
    apiRequestMock.mockResolvedValue(buildTransaction());
    const store = storeOnSummary(
      summaryCheckoutState({ idempotencyKey: 'restored-key' }),
    );

    await store.dispatch(payTransaction());

    expect(apiRequestMock.mock.calls[0][1]?.headers).toEqual({
      'Idempotency-Key': 'restored-key',
    });
  });

  it('keeps the HTTP status of a business error (409 = no stock)', async () => {
    apiRequestMock.mockRejectedValue(new ApiError(409, 'Sin stock'));
    const store = storeOnSummary();

    await store.dispatch(payTransaction());

    expect(store.getState().transaction).toMatchObject({
      error: 'Sin stock',
      errorStatus: 409,
    });
    expect(store.getState().checkout.step).toBe('SUMMARY');
  });

  it('uses a generic message for unexpected errors', async () => {
    apiRequestMock.mockRejectedValue(new Error('boom'));
    const store = storeOnSummary();

    await store.dispatch(payTransaction());

    expect(store.getState().transaction).toMatchObject({
      error: PAY_ERROR_MESSAGE,
      errorStatus: 500,
    });
  });

  it('ignores a second click while the payment is in progress', async () => {
    let resolve!: (value: unknown) => void;
    apiRequestMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const store = storeOnSummary();

    const first = store.dispatch(payTransaction());
    void store.dispatch(payTransaction());
    resolve(buildTransaction());
    await first;

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generic message if the rejection has no payload', () => {
    const store = storeOnSummary();
    store.dispatch({ type: payTransaction.rejected.type, error: {} });

    expect(store.getState().transaction).toMatchObject({
      error: PAY_ERROR_MESSAGE,
      errorStatus: null,
    });
  });

  it('is cleared when the checkout finishes', async () => {
    apiRequestMock.mockResolvedValue(buildTransaction());
    const store = storeOnSummary();
    await store.dispatch(payTransaction());

    store.dispatch(checkoutFinished());

    expect(store.getState().transaction).toEqual(initialTransactionState);
  });
});
