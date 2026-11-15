import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RootState } from '../../app/store';
import { ApiError, apiRequest } from '../../shared/api/httpClient';
import { renderWithProviders } from '../../test/renderWithProviders';
import { initialCheckoutState } from '../checkout/checkoutSlice';
import {
  MAX_POLLS,
  POLL_INTERVAL_MS,
  REDIRECT_SECONDS,
  ResultPage,
} from './ResultPage';
import { buildTransaction } from './transaction.fixture';
import { initialTransactionState } from './transactionSlice';
import type { Transaction } from './types';

jest.mock('../../shared/api/httpClient', () => ({
  ...jest.requireActual('../../shared/api/httpClient'),
  apiRequest: jest.fn(),
}));
const apiRequestMock = jest.mocked(apiRequest);

const resultState = (
  current: Transaction | null,
  overrides: Partial<RootState['checkout']> = {},
): Partial<RootState> => ({
  checkout: {
    ...initialCheckoutState,
    step: 'RESULT',
    productId: 'prod-1',
    transactionId: 'tx-1',
    customer: { fullName: 'Jane', email: 'jane@example.com', phone: '300' },
    delivery: { ...initialCheckoutState.delivery, city: 'Medellín' },
    ...overrides,
  },
  transaction: {
    ...initialTransactionState,
    current,
    status: current ? 'succeeded' : 'idle',
  },
});

const renderResult = (
  current: Transaction | null,
  overrides: Partial<RootState['checkout']> = {},
) =>
  renderWithProviders(<ResultPage />, {
    preloadedState: resultState(current, overrides),
  });

describe('ResultPage', () => {
  beforeEach(() => apiRequestMock.mockReset());
  afterEach(() => jest.useRealTimers());

  describe('approved', () => {
    it('shows the confirmation and the purchase details', () => {
      renderResult(buildTransaction({ status: 'APPROVED' }));

      expect(
        screen.getByRole('heading', { name: '¡Pago aprobado!' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Lo enviaremos a Calle 10 # 20-30, Medellín\./),
      ).toBeInTheDocument();
      expect(screen.getByText('Parlante portátil × 1')).toBeInTheDocument();
      expect(screen.getByText(/167\.500/)).toBeInTheDocument();
      expect(screen.getByText(/•••• 4242/)).toBeInTheDocument();
      expect(screen.getByText('ref-1')).toBeInTheDocument();
    });

    it('goes back to the store automatically after the countdown', () => {
      jest.useFakeTimers();
      const { store } = renderResult(buildTransaction({ status: 'APPROVED' }));

      expect(
        screen.getByText(`Volverás a la tienda en ${REDIRECT_SECONDS} s.`),
      ).toBeInTheDocument();
      act(() => jest.advanceTimersByTime(1000));
      expect(
        screen.getByText(`Volverás a la tienda en ${REDIRECT_SECONDS - 1} s.`),
      ).toBeInTheDocument();

      for (let i = 0; i < REDIRECT_SECONDS; i++) {
        act(() => jest.advanceTimersByTime(1000));
      }

      // Step 5: back to the product page, personal data wiped.
      expect(store.getState().checkout).toEqual(initialCheckoutState);
    });

    it('can go back to the store right away', async () => {
      const { store } = renderResult(buildTransaction({ status: 'APPROVED' }));

      await userEvent.click(
        screen.getByRole('button', { name: 'Volver a la tienda ahora' }),
      );

      expect(store.getState().checkout.step).toBe('PRODUCT');
      expect(store.getState().transaction.current).toBeNull();
    });
  });

  describe('declined / failed', () => {
    it('explains that nothing was charged and offers to retry', async () => {
      const { store } = renderResult(
        buildTransaction({
          status: 'DECLINED',
          statusMessage: 'Fondos insuficientes',
        }),
        { card: { brand: 'VISA', lastFour: '1111' }, idempotencyKey: 'k-1' },
      );

      expect(
        screen.getByRole('heading', { name: 'Pago rechazado' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Fondos insuficientes. No se hizo ningún cobro.'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Volverás a la tienda/)).toBeNull();

      await userEvent.click(
        screen.getByRole('button', { name: 'Intentar con otra tarjeta' }),
      );

      // Back to the form: delivery kept, card and attempt cleared.
      expect(store.getState().checkout).toMatchObject({
        step: 'PAYMENT_FORM',
        card: null,
        transactionId: null,
        idempotencyKey: null,
        delivery: { city: 'Medellín' },
      });
      expect(store.getState().transaction.current).toBeNull();
    });

    it('uses a default message when the gateway gives none', () => {
      renderResult(
        buildTransaction({ status: 'DECLINED', statusMessage: null }),
      );

      expect(
        screen.getByText('Tu banco rechazó el pago. No se hizo ningún cobro.'),
      ).toBeInTheDocument();
    });

    it.each<[Transaction['status'], string | null, string, string]>([
      [
        'ERROR',
        'Sin conexión con la pasarela',
        'No pudimos completar el pago',
        'Sin conexión con la pasarela.',
      ],
      [
        'ERROR',
        null,
        'No pudimos completar el pago',
        'Ocurrió un error con el pago.',
      ],
      [
        'VOIDED',
        null,
        'Pago anulado',
        'El pago fue anulado. No se hizo ningún cobro.',
      ],
    ])('%s (%s)', async (status, statusMessage, title, message) => {
      const { store } = renderResult(
        buildTransaction({ status, statusMessage }),
      );

      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.getByText(message)).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole('button', { name: 'Volver a la tienda' }),
      );
      expect(store.getState().checkout.step).toBe('PRODUCT');
    });
  });

  describe('pending', () => {
    it('polls until the payment is settled', async () => {
      jest.useFakeTimers();
      apiRequestMock
        .mockResolvedValueOnce(buildTransaction({ status: 'PENDING' }))
        .mockResolvedValueOnce(buildTransaction({ status: 'APPROVED' }));
      renderResult(buildTransaction({ status: 'PENDING' }));

      expect(
        screen.getByRole('heading', { name: 'Estamos confirmando tu pago…' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button')).toBeNull();

      await act(() => jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS));
      expect(apiRequestMock).toHaveBeenCalledWith('/transactions/tx-1');
      await act(() => jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

      expect(
        screen.getByRole('heading', { name: '¡Pago aprobado!' }),
      ).toBeInTheDocument();
      expect(apiRequestMock).toHaveBeenCalledTimes(2);
    });

    it('keeps polling when one poll fails', async () => {
      jest.useFakeTimers();
      apiRequestMock
        .mockRejectedValueOnce(new ApiError(0, 'Sin conexión'))
        .mockResolvedValueOnce(buildTransaction({ status: 'DECLINED' }));
      renderResult(buildTransaction({ status: 'PENDING' }));

      await act(() => jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS));
      // The failed poll does not replace the screen.
      expect(
        screen.getByRole('heading', { name: 'Estamos confirmando tu pago…' }),
      ).toBeInTheDocument();
      await act(() => jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS));

      expect(
        screen.getByRole('heading', { name: 'Pago rechazado' }),
      ).toBeInTheDocument();
    });

    it('stops after the max attempts and lets the customer check again', async () => {
      jest.useFakeTimers();
      apiRequestMock.mockResolvedValue(buildTransaction({ status: 'PENDING' }));
      renderResult(buildTransaction({ status: 'PENDING' }));

      for (let i = 0; i < MAX_POLLS + 2; i++) {
        await act(() => jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS));
      }

      expect(apiRequestMock).toHaveBeenCalledTimes(MAX_POLLS);
      expect(screen.getByText(/Tu pago sigue en proceso/)).toBeInTheDocument();

      apiRequestMock.mockResolvedValue(
        buildTransaction({ status: 'APPROVED' }),
      );
      await act(async () => {
        screen.getByRole('button', { name: 'Consultar de nuevo' }).click();
        await jest.advanceTimersByTimeAsync(0);
      });

      expect(
        screen.getByRole('heading', { name: '¡Pago aprobado!' }),
      ).toBeInTheDocument();
    });
  });

  describe('after a refresh (only the id is persisted)', () => {
    it('recovers the transaction from the backend', async () => {
      apiRequestMock.mockResolvedValue(
        buildTransaction({ status: 'DECLINED' }),
      );

      renderResult(null);

      expect(
        screen.getByRole('heading', {
          name: 'Consultando el estado de tu pago…',
        }),
      ).toBeInTheDocument();
      expect(
        await screen.findByRole('heading', { name: 'Pago rechazado' }),
      ).toBeInTheDocument();
      expect(apiRequestMock).toHaveBeenCalledWith('/transactions/tx-1');
    });

    it('lets the customer retry if the lookup fails', async () => {
      apiRequestMock
        .mockRejectedValueOnce(new ApiError(0, 'Sin conexión'))
        .mockResolvedValueOnce(buildTransaction({ status: 'APPROVED' }));
      renderResult(null);

      expect(
        await screen.findByRole('heading', {
          name: 'No pudimos consultar tu pago',
        }),
      ).toBeInTheDocument();
      expect(screen.getByText('Sin conexión')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

      expect(
        await screen.findByRole('heading', { name: '¡Pago aprobado!' }),
      ).toBeInTheDocument();
    });

    it('says so when the transaction no longer exists', async () => {
      apiRequestMock.mockRejectedValue(new ApiError(404, 'Not found'));
      const { store } = renderResult(null);

      expect(
        await screen.findByRole('heading', {
          name: 'No encontramos tu transacción',
        }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();

      await userEvent.click(
        screen.getByRole('button', { name: 'Volver a la tienda' }),
      );
      expect(store.getState().checkout.step).toBe('PRODUCT');
    });

    it('handles a result step without a transaction id', () => {
      renderResult(null, { transactionId: null });

      expect(
        screen.getByRole('heading', { name: 'No encontramos tu transacción' }),
      ).toBeInTheDocument();
      expect(apiRequestMock).not.toHaveBeenCalled();
    });
  });
});
