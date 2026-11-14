import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { conflict } from '../src/shared/domain/app-error';
import { err, ok } from '../src/shared/domain/result';
import { CreateTransactionUseCase } from '../src/transactions/application/create-transaction.use-case';
import { GetQuoteUseCase } from '../src/transactions/application/get-quote.use-case';
import { GetTransactionUseCase } from '../src/transactions/application/get-transaction.use-case';
import {
  buildOrder,
  buildTransaction,
  PRODUCT_ID,
  TX_ID,
} from '../src/transactions/domain/transaction.fixture';
import { QuotesController } from '../src/transactions/infrastructure/http/quotes.controller';
import { TransactionsController } from '../src/transactions/infrastructure/http/transactions.controller';

const validBody = () => ({
  productId: PRODUCT_ID,
  quantity: 1,
  customer: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '3001234567',
  },
  delivery: {
    addressLine1: 'Calle 10 # 20-30',
    city: 'Medellín',
    region: 'Antioquia',
    postalCode: '050021',
  },
  payment: {
    cardToken: 'tok_test_123',
    installments: 1,
    cardBrand: 'VISA',
    cardLastFour: '4242',
    acceptanceToken: 'acc',
    personalDataAuthToken: 'personal',
  },
});

describe('Transactions & quotes (e2e)', () => {
  let app: INestApplication<App>;
  const create = { execute: jest.fn() };
  const get = { execute: jest.fn() };
  const quote = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TransactionsController, QuotesController],
      providers: [
        { provide: CreateTransactionUseCase, useValue: create },
        { provide: GetTransactionUseCase, useValue: get },
        { provide: GetQuoteUseCase, useValue: quote },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    // Same pipe configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.resetAllMocks());

  describe('POST /api/transactions', () => {
    it('201 with the created transaction', async () => {
      create.execute.mockResolvedValue(
        ok(buildTransaction({ status: 'APPROVED' })),
      );

      const res = await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Idempotency-Key', 'checkout-123')
        .send(validBody())
        .expect(201);

      expect(res.body).toMatchObject({
        id: TX_ID,
        status: 'APPROVED',
        customer: { email: 'j***@example.com' },
      });
      expect(create.execute).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: 'checkout-123' }),
      );
    });

    it.each([
      [
        'an invalid email',
        { customer: { ...validBody().customer, email: 'x' } },
      ],
      ['quantity 0', { quantity: 0 }],
      ['quantity above the max', { quantity: 6 }],
      [
        'an unsupported card brand',
        { payment: { ...validBody().payment, cardBrand: 'AMEX' } },
      ],
      [
        'a full card number instead of the last 4',
        {
          payment: { ...validBody().payment, cardLastFour: '4242424242424242' },
        },
      ],
      ['a missing delivery address', { delivery: undefined }],
      [
        'an unknown field (e.g. raw card data)',
        { cardNumber: '4242424242424242' },
      ],
    ])('400 for %s', async (_case, override) => {
      await request(app.getHttpServer())
        .post('/api/transactions')
        .send({ ...validBody(), ...override })
        .expect(400);

      expect(create.execute).not.toHaveBeenCalled();
    });

    it('409 when there is no stock', async () => {
      create.execute.mockResolvedValue(err(conflict('no stock')));

      await request(app.getHttpServer())
        .post('/api/transactions')
        .send(validBody())
        .expect(409);
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('200 with the transaction', async () => {
      get.execute.mockResolvedValue(ok(buildTransaction()));

      await request(app.getHttpServer())
        .get(`/api/transactions/${TX_ID}`)
        .expect(200);
    });

    it('400 for an invalid id', async () => {
      await request(app.getHttpServer())
        .get('/api/transactions/abc')
        .expect(400);
    });
  });

  describe('GET /api/quotes', () => {
    it('200 with the amounts (quantity comes as a query string)', async () => {
      quote.execute.mockResolvedValue(ok(buildOrder().amounts));

      const res = await request(app.getHttpServer())
        .get(`/api/quotes?productId=${PRODUCT_ID}&quantity=2`)
        .expect(200);

      expect(quote.execute).toHaveBeenCalledWith(PRODUCT_ID, 2);
      expect(res.body).toMatchObject({ totalAmountInCents: 2_300_000 });
    });

    it('400 without productId', async () => {
      await request(app.getHttpServer())
        .get('/api/quotes?quantity=1')
        .expect(400);
    });
  });
});
