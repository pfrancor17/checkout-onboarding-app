import { screen } from '@testing-library/react';
import App from './App';
import { initialCheckoutState } from './features/checkout/checkoutSlice';
import { apiRequest } from './shared/api/httpClient';
import { renderWithProviders } from './test/renderWithProviders';

jest.mock('./shared/api/httpClient', () => ({
  ...jest.requireActual('./shared/api/httpClient'),
  apiRequest: jest.fn(),
}));

describe('App', () => {
  beforeEach(() => jest.mocked(apiRequest).mockResolvedValue([]));

  it('shows the header and starts on the product page', async () => {
    renderWithProviders(<App />);

    expect(screen.getByText('Checkout Store')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Nuestros productos',
      }),
    ).toBeInTheDocument();
  });

  it('keeps the product page interactive when no modal is open', async () => {
    renderWithProviders(<App />);

    await screen.findByRole('heading', { name: 'Nuestros productos' });
    expect(screen.getByTestId('product-page')).not.toHaveAttribute('inert');
  });

  it('makes the page behind the payment modal inert (focus stays in the dialog)', () => {
    renderWithProviders(<App />, {
      preloadedState: {
        checkout: { ...initialCheckoutState, step: 'PAYMENT_FORM' },
      },
    });

    const page = screen.getByTestId('product-page');
    const dialog = screen.getByRole('dialog');
    expect(page).toHaveAttribute('inert');
    // The dialog itself is outside the inert area.
    expect(page.contains(dialog)).toBe(false);
  });

  it('opens the payment form as a modal over the products', async () => {
    renderWithProviders(<App />, {
      preloadedState: {
        checkout: { ...initialCheckoutState, step: 'PAYMENT_FORM' },
      },
    });

    expect(
      screen.getByRole('dialog', { name: 'Datos de pago y entrega' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Nuestros productos' }),
    ).toBeInTheDocument();
  });

  it('shows the summary backdrop on the summary step', () => {
    renderWithProviders(<App />, {
      preloadedState: {
        checkout: { ...initialCheckoutState, step: 'SUMMARY' },
      },
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Resumen de tu compra' }),
    ).toBeInTheDocument();
  });

  it('shows the result page on the result step', () => {
    // The transaction lookup stays in flight for this test.
    jest.mocked(apiRequest).mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<App />, {
      preloadedState: {
        checkout: {
          ...initialCheckoutState,
          step: 'RESULT',
          transactionId: 'tx-1',
        },
      },
    });

    expect(
      screen.getByRole('heading', {
        name: 'Consultando el estado de tu pago…',
      }),
    ).toBeInTheDocument();
  });
});
