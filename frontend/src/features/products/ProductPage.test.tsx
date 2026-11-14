import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, apiRequest } from '../../shared/api/httpClient';
import { renderWithProviders } from '../../test/renderWithProviders';
import { buildProduct } from './product.fixture';
import { ProductPage } from './ProductPage';

jest.mock('../../shared/api/httpClient', () => ({
  ...jest.requireActual('../../shared/api/httpClient'),
  apiRequest: jest.fn(),
}));
const apiRequestMock = jest.mocked(apiRequest);

describe('ProductPage', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('shows a loading state, then the products', async () => {
    apiRequestMock.mockResolvedValue([
      buildProduct({ id: 'a', name: 'Speaker' }),
      buildProduct({ id: 'b', name: 'Headphones' }),
    ]);

    renderWithProviders(<ProductPage />);

    expect(screen.getByLabelText('Cargando productos')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Speaker' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Headphones' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Cargando productos'),
    ).not.toBeInTheDocument();
  });

  it('starts the checkout with the chosen product and quantity', async () => {
    apiRequestMock.mockResolvedValue([buildProduct({ id: 'a', stock: 3 })]);
    const { store } = renderWithProviders(<ProductPage />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Agregar una unidad' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Pagar con tarjeta de crédito' }),
    );

    expect(store.getState().checkout).toMatchObject({
      step: 'PAYMENT_FORM',
      productId: 'a',
      quantity: 2,
    });
  });

  it('shows the error and lets the customer retry', async () => {
    apiRequestMock
      .mockRejectedValueOnce(new ApiError(0, 'Sin conexión'))
      .mockResolvedValueOnce([buildProduct({ name: 'Speaker' })]);

    renderWithProviders(<ProductPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('heading', { name: 'Speaker' }),
    ).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
  });

  it('says so when there are no products', async () => {
    apiRequestMock.mockResolvedValue([]);

    renderWithProviders(<ProductPage />);

    expect(
      await screen.findByText('No hay productos disponibles por ahora.'),
    ).toBeInTheDocument();
  });

  it('refreshes the stock every time the page is shown', async () => {
    apiRequestMock.mockResolvedValue([buildProduct({ stock: 9 })]);
    const { unmount } = renderWithProviders(<ProductPage />);
    await screen.findByText('9 unidades disponibles');
    unmount();

    apiRequestMock.mockResolvedValue([buildProduct({ stock: 8 })]);
    renderWithProviders(<ProductPage />);

    await waitFor(() =>
      expect(screen.getByText('8 unidades disponibles')).toBeInTheDocument(),
    );
  });
});
