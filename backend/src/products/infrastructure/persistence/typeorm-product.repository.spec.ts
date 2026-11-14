import { Repository } from 'typeorm';
import { Product } from '../../domain/product';
import { ProductOrmEntity } from './product.orm-entity';
import { TypeOrmProductRepository } from './typeorm-product.repository';

const entity = (overrides: Partial<ProductOrmEntity> = {}): ProductOrmEntity =>
  Object.assign(new ProductOrmEntity(), {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    sku: 'SKU-1',
    name: 'Speaker',
    description: 'Loud',
    priceInCents: 15_450_000,
    currency: 'COP',
    stock: 3,
    imageUrl: 'https://img',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('TypeOrmProductRepository', () => {
  const ormRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
  };
  const repository = new TypeOrmProductRepository(
    ormRepository as unknown as Repository<ProductOrmEntity>,
  );

  beforeEach(() => jest.resetAllMocks());

  it('findAll maps entities to domain products ordered by name', async () => {
    ormRepository.find.mockResolvedValue([entity()]);

    const products = await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    expect(products[0]).toBeInstanceOf(Product);
    expect(products[0]).toMatchObject({
      sku: 'SKU-1',
      priceInCents: 15_450_000,
      stock: 3,
      imageUrl: 'https://img',
    });
  });

  it('findById returns the mapped product', async () => {
    ormRepository.findOneBy.mockResolvedValue(entity());

    const product = await repository.findById('id-1');

    expect(ormRepository.findOneBy).toHaveBeenCalledWith({ id: 'id-1' });
    expect(product?.name).toBe('Speaker');
  });

  it('findById returns null when nothing is found', async () => {
    ormRepository.findOneBy.mockResolvedValue(null);

    await expect(repository.findById('missing')).resolves.toBeNull();
  });
});
