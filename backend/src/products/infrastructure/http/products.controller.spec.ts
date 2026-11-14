import { NotFoundException } from '@nestjs/common';
import { notFound } from '../../../shared/domain/app-error';
import { err, ok } from '../../../shared/domain/result';
import { GetProductByIdUseCase } from '../../application/get-product-by-id.use-case';
import { GetProductsUseCase } from '../../application/get-products.use-case';
import { buildProduct } from '../../domain/product.fixture';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  const getProducts = { execute: jest.fn() };
  const getProductById = { execute: jest.fn() };
  const controller = new ProductsController(
    getProducts as unknown as GetProductsUseCase,
    getProductById as unknown as GetProductByIdUseCase,
  );

  beforeEach(() => jest.resetAllMocks());

  it('GET /products returns the products as DTOs', async () => {
    getProducts.execute.mockResolvedValue(
      ok([buildProduct({ stock: 2 }), buildProduct({ id: 'b', stock: 0 })]),
    );

    const response = await controller.findAll();

    expect(response).toHaveLength(2);
    expect(response[0]).toEqual({
      id: '6f1c3b5e-8a4d-4b8e-9c2a-1d2e3f4a5b6c',
      name: 'Test Product',
      description: 'A product used in tests',
      priceInCents: 1_000_000,
      currency: 'COP',
      stock: 2,
      available: true,
      imageUrl: null,
    });
    expect(response[1].available).toBe(false);
    expect(response[0]).not.toHaveProperty('sku');
  });

  it('GET /products throws when the use case fails', async () => {
    getProducts.execute.mockResolvedValue(err(notFound('x')));

    await expect(controller.findAll()).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('GET /products/:id returns one product', async () => {
    getProductById.execute.mockResolvedValue(ok(buildProduct()));

    const response = await controller.findOne('id');

    expect(getProductById.execute).toHaveBeenCalledWith('id');
    expect(response.name).toBe('Test Product');
  });

  it('GET /products/:id maps NOT_FOUND to 404', async () => {
    getProductById.execute.mockResolvedValue(err(notFound('missing')));

    await expect(controller.findOne('id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
