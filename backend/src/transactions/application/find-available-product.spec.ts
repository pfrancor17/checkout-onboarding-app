import { buildProduct } from '../../products/domain/product.fixture';
import { findAvailableProduct } from './find-available-product';
import { mockProductRepository } from './test-doubles.fixture';

describe('findAvailableProduct', () => {
  const products = mockProductRepository();

  beforeEach(() => jest.resetAllMocks());

  it('returns the product when there is enough stock', async () => {
    const product = buildProduct({ stock: 3 });
    products.findById.mockResolvedValue(product);

    const result = await findAvailableProduct(products, product.id, 3);

    expect(result.isOk && result.value).toBe(product);
  });

  it('returns NOT_FOUND for an unknown product', async () => {
    products.findById.mockResolvedValue(null);

    const result = await findAvailableProduct(products, 'missing', 1);

    expect(result.isErr && result.error.code).toBe('NOT_FOUND');
  });

  it('returns VALIDATION above the max units per order', async () => {
    products.findById.mockResolvedValue(buildProduct({ stock: 100 }));

    const result = await findAvailableProduct(products, 'id', 6);

    expect(result.isErr && result.error).toMatchObject({
      code: 'VALIDATION',
      message: 'You can buy up to 5 units per order',
    });
  });

  it('returns CONFLICT when the stock is not enough', async () => {
    products.findById.mockResolvedValue(
      buildProduct({ stock: 1, name: 'Speaker' }),
    );

    const result = await findAvailableProduct(products, 'id', 2);

    expect(result.isErr && result.error).toMatchObject({
      code: 'CONFLICT',
      message: 'Only 1 unit(s) of Speaker are available',
    });
  });

  it('returns UNEXPECTED when the repository fails', async () => {
    products.findById.mockRejectedValue(new Error('db down'));

    const result = await findAvailableProduct(products, 'id', 1);

    expect(result.isErr && result.error.code).toBe('UNEXPECTED');
  });
});
