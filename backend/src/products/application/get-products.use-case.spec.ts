import { ProductRepository } from '../domain/product.repository';
import { buildProduct } from '../domain/product.fixture';
import { GetProductsUseCase } from './get-products.use-case';

describe('GetProductsUseCase', () => {
  const repository: jest.Mocked<ProductRepository> = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };
  const useCase = new GetProductsUseCase(repository);

  beforeEach(() => jest.resetAllMocks());

  it('returns the products on the success track', async () => {
    const products = [buildProduct(), buildProduct({ id: 'other' })];
    repository.findAll.mockResolvedValue(products);

    const result = await useCase.execute();

    expect(result.isOk && result.value).toEqual(products);
  });

  it('returns an UNEXPECTED error when the repository fails', async () => {
    repository.findAll.mockRejectedValue(new Error('db down'));

    const result = await useCase.execute();

    expect(result.isErr && result.error.code).toBe('UNEXPECTED');
  });
});
