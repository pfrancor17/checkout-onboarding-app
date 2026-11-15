import { setupStore } from '../../app/store';
import { ApiError, apiRequest } from '../../shared/api/httpClient';
import {
  checkoutFinished,
  paymentRetried,
  summaryDismissed,
} from '../checkout/checkoutSlice';
import {
  fetchAcceptanceTokens,
  fetchQuote,
  initialSummaryState,
  personalDataAcceptanceChanged,
  termsAcceptanceChanged,
} from './summarySlice';

jest.mock('../../shared/api/httpClient', () => ({
  ...jest.requireActual('../../shared/api/httpClient'),
  apiRequest: jest.fn(),
}));
const apiRequestMock = jest.mocked(apiRequest);

const quote = {
  unitPriceInCents: 100,
  quantity: 2,
  productAmountInCents: 200,
  baseFeeInCents: 10,
  deliveryFeeInCents: 20,
  totalAmountInCents: 230,
  currency: 'COP',
};
const tokens = {
  acceptanceToken: 'acc',
  termsUrl: 'https://terms.pdf',
  personalDataAuthToken: 'personal',
  personalDataPolicyUrl: 'https://personal.pdf',
};

describe('summarySlice', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('loads the quote from GET /quotes', async () => {
    apiRequestMock.mockResolvedValue(quote);
    const store = setupStore();

    const pending = store.dispatch(
      fetchQuote({ productId: 'p 1', quantity: 2 }),
    );
    expect(store.getState().summary.quote.status).toBe('loading');
    await pending;

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/quotes?productId=p+1&quantity=2',
    );
    expect(store.getState().summary.quote).toEqual({
      data: quote,
      status: 'succeeded',
      error: null,
    });
  });

  it('keeps the error when the quote fails', async () => {
    apiRequestMock.mockRejectedValue(new ApiError(409, 'Sin stock'));
    const store = setupStore();

    await store.dispatch(fetchQuote({ productId: 'p', quantity: 9 }));

    expect(store.getState().summary.quote).toMatchObject({
      status: 'failed',
      error: 'Sin stock',
    });
  });

  it('uses a generic message for unexpected quote errors', async () => {
    apiRequestMock.mockRejectedValue(new Error('boom'));
    const store = setupStore();

    await store.dispatch(fetchQuote({ productId: 'p', quantity: 1 }));

    expect(store.getState().summary.quote.error).toBe(
      'No pudimos calcular el total.',
    );
  });

  it('loads the acceptance tokens', async () => {
    apiRequestMock.mockResolvedValue(tokens);
    const store = setupStore();

    const pending = store.dispatch(fetchAcceptanceTokens());
    expect(store.getState().summary.acceptance.status).toBe('loading');
    await pending;

    expect(apiRequestMock).toHaveBeenCalledWith('/payments/acceptance-tokens');
    expect(store.getState().summary.acceptance.data).toEqual(tokens);
  });

  it('keeps the error when the acceptance tokens fail', async () => {
    apiRequestMock.mockRejectedValue(new Error('boom'));
    const store = setupStore();

    await store.dispatch(fetchAcceptanceTokens());

    expect(store.getState().summary.acceptance).toMatchObject({
      status: 'failed',
      error: 'No pudimos cargar los términos y condiciones.',
    });
  });

  it('falls back to generic messages if a rejection has no payload', () => {
    const store = setupStore();
    store.dispatch({ type: fetchQuote.rejected.type, error: {} });
    store.dispatch({ type: fetchAcceptanceTokens.rejected.type, error: {} });

    expect(store.getState().summary.quote.error).toBe(
      'No pudimos calcular el total.',
    );
    expect(store.getState().summary.acceptance.error).toBe(
      'No pudimos cargar los términos y condiciones.',
    );
  });

  it('records the acceptances and resets them when leaving the summary', () => {
    const store = setupStore();
    store.dispatch(termsAcceptanceChanged(true));
    store.dispatch(personalDataAcceptanceChanged(true));
    expect(store.getState().summary).toMatchObject({
      termsAccepted: true,
      personalDataAccepted: true,
    });

    store.dispatch(summaryDismissed());
    expect(store.getState().summary).toEqual(initialSummaryState);

    store.dispatch(termsAcceptanceChanged(true));
    store.dispatch(checkoutFinished());
    expect(store.getState().summary).toEqual(initialSummaryState);

    store.dispatch(termsAcceptanceChanged(true));
    store.dispatch(paymentRetried());
    expect(store.getState().summary).toEqual(initialSummaryState);
  });
});
