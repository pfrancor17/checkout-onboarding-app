import { screen } from '@testing-library/react';
import App from './App';
import {
  type CheckoutStep,
  initialCheckoutState,
} from './features/checkout/checkoutSlice';
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

  it.each<[CheckoutStep, string]>([
    ['SUMMARY', 'Resumen'],
    ['RESULT', 'Resultado del pago'],
  ])(
    'restores the %s step from the store (e.g. after a refresh)',
    (step, title) => {
      renderWithProviders(<App />, {
        preloadedState: { checkout: { ...initialCheckoutState, step } },
      });

      expect(
        screen.getByRole('heading', { level: 1, name: title }),
      ).toBeInTheDocument();
    },
  );
});
