import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RootState } from '../../app/store';
import { ApiError, apiRequest } from '../../shared/api/httpClient';
import { summaryCheckoutState } from '../../test/checkoutState.fixture';
import { renderWithProviders } from '../../test/renderWithProviders';
import { initialPaymentState } from '../payment/paymentSlice';
import { buildProduct } from '../products/product.fixture';
import { initialProductsState } from '../products/productsSlice';
import { buildTransaction } from '../transaction/transaction.fixture';
import { SummaryBackdrop } from './SummaryBackdrop';

jest.mock('../../shared/api/httpClient', () => ({
  ...jest.requireActual('../../shared/api/httpClient'),
  apiRequest: jest.fn(),
}));
const apiRequestMock = jest.mocked(apiRequest);

const quote = {
  unitPriceInCents: 15_450_000,
  quantity: 2,
  productAmountInCents: 30_900_000,
  baseFeeInCents: 300_000,
  deliveryFeeInCents: 1_000_000,
  totalAmountInCents: 32_200_000,
  currency: 'COP',
};
const tokens = {
  acceptanceToken: 'acc',
  termsUrl: 'https://terms.test/terms.pdf',
  personalDataAuthToken: 'personal',
  personalDataPolicyUrl: 'https://terms.test/data.pdf',
};

type Responses = Partial<
  Record<'quote' | 'tokens' | 'products' | 'pay', unknown>
>;

/** Routes the mocked API by path. A value that is an Error is thrown. */
const mockApi = (responses: Responses = {}) => {
  apiRequestMock.mockImplementation((path: string) => {
    const pick = (key: keyof Responses, fallback: unknown) => {
      const value = key in responses ? responses[key] : fallback;
      return value instanceof Error
        ? Promise.reject(value)
        : Promise.resolve(value);
    };
    if (path.startsWith('/quotes')) return pick('quote', quote);
    if (path === '/payments/acceptance-tokens') return pick('tokens', tokens);
    if (path === '/products') return pick('products', []);
    return pick('pay', buildTransaction());
  });
};

const renderSummary = (preloaded: Partial<RootState> = {}) =>
  renderWithProviders(<SummaryBackdrop />, {
    preloadedState: {
      checkout: summaryCheckoutState(),
      payment: { ...initialPaymentState, cardToken: 'tok_test_1' },
      products: {
        ...initialProductsState,
        status: 'succeeded',
        items: [buildProduct({ id: 'prod-1', name: 'Parlante portátil' })],
      },
      ...preloaded,
    },
  });

const payButton = () => screen.getByRole('button', { name: /^Pagar/ });

const acceptAll = async () => {
  await userEvent.click(
    await screen.findByRole('checkbox', { name: /términos y condiciones/ }),
  );
  await userEvent.click(
    screen.getByRole('checkbox', { name: /tratamiento de mis datos/ }),
  );
};

describe('SummaryBackdrop', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('shows the backend breakdown: product + base fee + delivery = total', async () => {
    mockApi();
    renderSummary();

    expect(screen.getByText('Calculando el total…')).toBeInTheDocument();
    expect(await screen.findByText('Tarifa base')).toBeInTheDocument();
    expect(screen.getByText(/Producto \(2 ×/)).toBeInTheDocument();
    expect(screen.getByText('Envío')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText(/322\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText('Parlante portátil × 2')).toBeInTheDocument();
  });

  it('shows the card (brand + last 4) and the delivery data', async () => {
    mockApi();
    renderSummary();

    expect(await screen.findByText(/•••• 4242 · 3 cuotas/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'VISA' })).toBeInTheDocument();
    expect(screen.getByText(/Calle 10 # 20-30/)).toBeInTheDocument();
    expect(screen.getByText(/Medellín, Antioquia/)).toBeInTheDocument();
  });

  it('only enables the pay button once both acceptances are checked', async () => {
    mockApi();
    renderSummary();

    expect(
      await screen.findByRole('link', { name: 'términos y condiciones' }),
    ).toHaveAttribute('href', tokens.termsUrl);
    expect(payButton()).toBeDisabled();

    await acceptAll();

    expect(payButton()).toBeEnabled();
    expect(payButton()).toHaveTextContent(/Pagar \$\s?322\.000/);
  });

  it('pays and moves to the result step', async () => {
    mockApi();
    const { store } = renderSummary();
    await acceptAll();

    await userEvent.click(payButton());

    await waitFor(() => expect(store.getState().checkout.step).toBe('RESULT'));
    expect(store.getState().checkout.transactionId).toBe('tx-1');
  });

  it('shows the progress while paying', async () => {
    mockApi({ pay: new Promise(() => undefined) });
    apiRequestMock.mockImplementation((path: string) => {
      if (path.startsWith('/quotes')) return Promise.resolve(quote);
      if (path === '/payments/acceptance-tokens')
        return Promise.resolve(tokens);
      return new Promise(() => undefined);
    });
    renderSummary();
    await acceptAll();

    await userEvent.click(payButton());

    expect(
      screen.getByRole('button', { name: 'Procesando pago…' }),
    ).toBeDisabled();
    expect(
      screen.getByText(/No cierres ni recargues la página/),
    ).toBeInTheDocument();
  });

  it('offers to go back to the products when the stock ran out', async () => {
    mockApi({ pay: new ApiError(409, 'The product ran out of stock') });
    const { store } = renderSummary();
    await acceptAll();

    await userEvent.click(payButton());

    expect(
      await screen.findByText('The product ran out of stock'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Volver a los productos' }),
    );
    expect(store.getState().checkout.step).toBe('PRODUCT');
    // The delivery data is kept for the next attempt.
    expect(store.getState().checkout.delivery.city).toBe('Medellín');
  });

  it('shows other payment errors without the back-to-products action', async () => {
    mockApi({ pay: new ApiError(0, 'Sin conexión') });
    renderSummary();
    await acceptAll();

    await userEvent.click(payButton());

    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Volver a los productos' }),
    ).toBeNull();
  });

  it('lets the customer retry when the quote fails', async () => {
    mockApi({ quote: new ApiError(500, 'No pudimos calcular el total.') });
    renderSummary();

    expect(
      await screen.findByText('No pudimos calcular el total.'),
    ).toBeInTheDocument();
    mockApi();
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Reintentar' })[0],
    );

    expect(await screen.findByText('Tarifa base')).toBeInTheDocument();
  });

  it('lets the customer retry when the terms fail to load', async () => {
    mockApi({ tokens: new ApiError(502, 'Pasarela caída') });
    renderSummary();

    expect(await screen.findByText('Pasarela caída')).toBeInTheDocument();
    mockApi();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('checkbox', { name: /términos y condiciones/ }),
    ).toBeInTheDocument();
  });

  it('goes back to edit the data', async () => {
    mockApi();
    const { store } = renderSummary();

    await userEvent.click(screen.getByRole('button', { name: 'Editar datos' }));

    expect(store.getState().checkout.step).toBe('PAYMENT_FORM');
  });

  it('after a refresh (no card token) asks for the card again', async () => {
    mockApi({
      products: [buildProduct({ id: 'prod-1', name: 'Parlante portátil' })],
    });
    const { store } = renderSummary({
      payment: initialPaymentState,
      products: initialProductsState,
    });

    expect(
      screen.getByRole('region', { name: 'Vuelve a ingresar tu tarjeta' }),
    ).toBeInTheDocument();
    // Loads the products to show the product name.
    expect(
      await screen.findByText('Parlante portátil × 2'),
    ).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/quotes/),
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Ingresar tarjeta' }),
    );
    expect(store.getState().checkout.step).toBe('PAYMENT_FORM');
  });

  it('shows the installment in singular for a single payment', async () => {
    mockApi();
    renderSummary({
      checkout: summaryCheckoutState({
        installments: 1,
        delivery: {
          ...summaryCheckoutState().delivery,
          addressLine2: 'Apto 501',
        },
      }),
    });

    expect(await screen.findByText(/•••• 4242 · 1 cuota$/)).toBeInTheDocument();
    expect(screen.getByText(/Apto 501/)).toBeInTheDocument();
  });
});
