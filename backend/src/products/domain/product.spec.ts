import { buildProduct } from './product.fixture';

describe('Product', () => {
  it('exposes its properties', () => {
    const product = buildProduct({ name: 'Speaker', imageUrl: 'http://img' });

    expect(product).toMatchObject({
      id: expect.any(String) as string,
      sku: 'TEST-SKU-01',
      name: 'Speaker',
      description: 'A product used in tests',
      priceInCents: 1_000_000,
      currency: 'COP',
      stock: 5,
      imageUrl: 'http://img',
    });
  });

  it('is available only while it has stock', () => {
    expect(buildProduct({ stock: 1 }).isAvailable()).toBe(true);
    expect(buildProduct({ stock: 0 }).isAvailable()).toBe(false);
  });

  it.each([
    [1, true],
    [5, true],
    [6, false],
    [0, false],
    [-1, false],
    [1.5, false],
  ])('canFulfill(%p) with 5 in stock -> %p', (quantity, expected) => {
    expect(buildProduct({ stock: 5 }).canFulfill(quantity)).toBe(expected);
  });
});
