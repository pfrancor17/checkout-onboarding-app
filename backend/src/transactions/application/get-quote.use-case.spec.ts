import { buildProduct } from '../../products/domain/product.fixture';
import { GetQuoteUseCase } from './get-quote.use-case';
import { mockProductRepository } from './test-doubles.fixture';

describe('GetQuoteUseCase', () => {
  const products = mockProductRepository();
  const useCase = new GetQuoteUseCase(products, {
    baseFeeInCents: 300_000,
    deliveryFeeInCents: 1_000_000,
  });

  beforeEach(() => jest.resetAllMocks());

  it('returns the price breakdown', async () => {
    products.findById.mockResolvedValue(
      buildProduct({ priceInCents: 1_000_000, stock: 5 }),
    );

    const result = await useCase.execute('id', 2);

    expect(result.isOk && result.value).toEqual({
      unitPriceInCents: 1_000_000,
      quantity: 2,
      productAmountInCents: 2_000_000,
      baseFeeInCents: 300_000,
      deliveryFeeInCents: 1_000_000,
      totalAmountInCents: 3_300_000,
      currency: 'COP',
    });
  });

  it('propagates errors from the availability check', async () => {
    products.findById.mockResolvedValue(null);

    const result = await useCase.execute('id', 1);

    expect(result.isErr && result.error.code).toBe('NOT_FOUND');
  });
});
