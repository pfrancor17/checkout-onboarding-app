import { screen } from '@testing-library/react';
import App from './App';
import {
  type CheckoutStep,
  initialCheckoutState,
} from './features/checkout/checkoutSlice';
import { renderWithProviders } from './test/renderWithProviders';

describe('App', () => {
  it('shows the header and starts on the product step', () => {
    renderWithProviders(<App />);

    expect(screen.getByText('Checkout Store')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Producto' }),
    ).toBeInTheDocument();
  });

  it.each<[CheckoutStep, string]>([
    ['PAYMENT_FORM', 'Datos de pago y entrega'],
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
