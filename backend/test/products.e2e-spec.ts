import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { GetProductByIdUseCase } from '../src/products/application/get-product-by-id.use-case';
import { GetProductsUseCase } from '../src/products/application/get-products.use-case';
import { Product } from '../src/products/domain/product';
import { buildProduct } from '../src/products/domain/product.fixture';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../src/products/domain/product.repository';
import { ProductsController } from '../src/products/infrastructure/http/products.controller';

/** In-memory adapter: proves the use cases do not depend on TypeORM. */
class InMemoryProductRepository implements ProductRepository {
  constructor(private readonly items: Product[]) {}

  findAll(): Promise<Product[]> {
    return Promise.resolve(this.items);
  }

  findById(id: string): Promise<Product | null> {
    return Promise.resolve(this.items.find((p) => p.id === id) ?? null);
  }
}

describe('Products (e2e)', () => {
  let app: INestApplication<App>;
  const existingId = '6f1c3b5e-8a4d-4b8e-9c2a-1d2e3f4a5b6c';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        GetProductsUseCase,
        GetProductByIdUseCase,
        {
          provide: PRODUCT_REPOSITORY,
          useValue: new InMemoryProductRepository([
            buildProduct({ id: existingId }),
          ]),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/products -> 200 with the product list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/products')
      .expect(200);

    expect(res.body).toEqual([
      expect.objectContaining({ id: existingId, stock: 5, available: true }),
    ]);
  });

  it('GET /api/products/:id -> 200 for an existing product', () => {
    return request(app.getHttpServer())
      .get(`/api/products/${existingId}`)
      .expect(200)
      .expect((res) => {
        expect((res.body as { name: string }).name).toBe('Test Product');
      });
  });

  it('GET /api/products/:id -> 404 for an unknown product', () => {
    return request(app.getHttpServer())
      .get('/api/products/00000000-0000-4000-8000-000000000000')
      .expect(404);
  });

  it('GET /api/products/:id -> 400 for an invalid UUID', () => {
    return request(app.getHttpServer())
      .get('/api/products/not-a-uuid')
      .expect(400);
  });
});
