import { setupStore } from '../../app/store';
import { ApiError, apiRequest } from '../../shared/api/httpClient';
import { buildProduct } from './product.fixture';
import {
  fetchProducts,
  selectProductById,
  selectProducts,
  selectProductsError,
  selectProductsStatus,
} from './productsSlice';

jest.mock('../../shared/api/httpClient', () => ({
  ...jest.requireActual('../../shared/api/httpClient'),
  apiRequest: jest.fn(),
}));
const apiRequestMock = jest.mocked(apiRequest);

describe('productsSlice', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('loads the products from GET /products', async () => {
    const products = [buildProduct(), buildProduct({ id: 'prod-2' })];
    apiRequestMock.mockResolvedValue(products);
    const store = setupStore();

    const pending = store.dispatch(fetchProducts());
    expect(selectProductsStatus(store.getState())).toBe('loading');
    await pending;

    expect(apiRequestMock).toHaveBeenCalledWith('/products');
    expect(selectProductsStatus(store.getState())).toBe('succeeded');
    expect(selectProducts(store.getState())).toEqual(products);
    expect(selectProductById(store.getState(), 'prod-2')?.id).toBe('prod-2');
    expect(selectProductById(store.getState(), 'missing')).toBeNull();
  });

  it('keeps the API error message when it fails', async () => {
    apiRequestMock.mockRejectedValue(new ApiError(0, 'Sin conexión'));
    const store = setupStore();

    await store.dispatch(fetchProducts());

    expect(selectProductsStatus(store.getState())).toBe('failed');
    expect(selectProductsError(store.getState())).toBe('Sin conexión');
  });

  it('uses a generic message for unexpected errors', async () => {
    apiRequestMock.mockRejectedValue(new Error('boom'));
    const store = setupStore();

    await store.dispatch(fetchProducts());

    expect(selectProductsError(store.getState())).toBe(
      'No pudimos cargar los productos.',
    );
  });

  it('clears a previous error when retrying', async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError(500, 'Falló'));
    const store = setupStore();
    await store.dispatch(fetchProducts());

    apiRequestMock.mockResolvedValue([]);
    const retry = store.dispatch(fetchProducts());
    expect(selectProductsError(store.getState())).toBeNull();
    await retry;
    expect(selectProductsStatus(store.getState())).toBe('succeeded');
  });

  it('falls back to a generic message if the rejection has no payload', () => {
    const store = setupStore();
    store.dispatch({
      type: fetchProducts.rejected.type,
      error: { message: 'aborted' },
    });

    expect(selectProductsError(store.getState())).toBe(
      'No pudimos cargar los productos.',
    );
  });
});
