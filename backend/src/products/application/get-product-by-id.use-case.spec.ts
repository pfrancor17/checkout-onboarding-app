import { ProductRepository } from '../domain/product.repository';
import { buildProduct } from '../domain/product.fixture';
import { GetProductByIdUseCase } from './get-product-by-id.use-case';

describe('GetProductByIdUseCase', () => {
  const repository: jest.Mocked<ProductRepository> = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };
  const useCase = new GetProductByIdUseCase(repository);
  const id = '6f1c3b5e-8a4d-4b8e-9c2a-1d2e3f4a5b6c';

  beforeEach(() => jest.resetAllMocks());

  it('returns the product when it exists', async () => {
    const product = buildProduct({ id });
    repository.findById.mockResolvedValue(product);

    const result = await useCase.execute(id);

    expect(repository.findById).toHaveBeenCalledWith(id);
    expect(result.isOk && result.value).toBe(product);
  });

  it('returns NOT_FOUND when the product does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    const result = await useCase.execute(id);

    expect(result.isErr && result.error).toMatchObject({
      code: 'NOT_FOUND',
      message: `Product ${id} was not found`,
    });
  });

  it('returns UNEXPECTED when the repository fails', async () => {
    repository.findById.mockRejectedValue(new Error('db down'));

    const result = await useCase.execute(id);

    expect(result.isErr && result.error.code).toBe('UNEXPECTED');
  });
});
