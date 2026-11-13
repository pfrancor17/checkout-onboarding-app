import { PRODUCT_SEEDS, seedProducts } from './products.seed';

describe('seedProducts', () => {
  const query = jest.fn();

  beforeEach(() => query.mockReset());

  it('inserts every product with an idempotent statement', async () => {
    query.mockResolvedValue([{ id: 'uuid' }]);

    const inserted = await seedProducts({ query });

    expect(inserted).toBe(PRODUCT_SEEDS.length);
    expect(query).toHaveBeenCalledTimes(PRODUCT_SEEDS.length);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('ON CONFLICT ("sku") DO NOTHING');
    expect(params[0]).toBe(PRODUCT_SEEDS[0].sku);
  });

  it('does not count products that already exist', async () => {
    query.mockResolvedValueOnce([{ id: 'uuid' }]).mockResolvedValue([]);

    await expect(seedProducts({ query })).resolves.toBe(1);
  });

  it('only seeds valid products (positive price, non-negative stock, COP)', () => {
    for (const product of PRODUCT_SEEDS) {
      expect(product.priceInCents).toBeGreaterThan(0);
      expect(Number.isInteger(product.priceInCents)).toBe(true);
      expect(product.stock).toBeGreaterThanOrEqual(0);
      expect(product.currency).toBe('COP');
    }
    const skus = PRODUCT_SEEDS.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });
});
