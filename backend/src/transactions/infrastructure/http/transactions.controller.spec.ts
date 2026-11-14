import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { conflict, notFound } from '../../../shared/domain/app-error';
import { err, ok } from '../../../shared/domain/result';
import { CreateTransactionUseCase } from '../../application/create-transaction.use-case';
import { GetTransactionUseCase } from '../../application/get-transaction.use-case';
import { buildTransaction, TX_ID } from '../../domain/transaction.fixture';
import { CreateTransactionRequestDto } from './create-transaction.request';
import { TransactionsController } from './transactions.controller';

const body: CreateTransactionRequestDto = {
  productId: 'prod-1',
  quantity: 1,
  customer: { fullName: 'Jane Doe', email: 'jane@example.com', phone: '300' },
  delivery: { addressLine1: 'Calle 10', city: 'Medellín', region: 'Antioquia' },
  payment: {
    cardToken: 'tok',
    installments: 1,
    cardBrand: 'VISA',
    cardLastFour: '4242',
    acceptanceToken: 'acc',
    personalDataAuthToken: 'personal',
  },
};

describe('TransactionsController', () => {
  const create = { execute: jest.fn() };
  const get = { execute: jest.fn() };
  const controller = new TransactionsController(
    create as unknown as CreateTransactionUseCase,
    get as unknown as GetTransactionUseCase,
  );

  beforeEach(() => jest.resetAllMocks());

  describe('POST /transactions', () => {
    it('maps the body to a command and masks the response', async () => {
      create.execute.mockResolvedValue(
        ok(
          buildTransaction({ status: 'APPROVED', gatewayTransactionId: 'gw' }),
        ),
      );

      const response = await controller.create(body, 'key-1');

      expect(create.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: 'key-1',
          delivery: {
            addressLine1: 'Calle 10',
            addressLine2: null,
            city: 'Medellín',
            region: 'Antioquia',
            postalCode: null,
          },
        }),
      );
      expect(response.status).toBe('APPROVED');
      expect(response.customer).toEqual({
        id: 'cust-1',
        fullName: 'Jane Doe',
        email: 'j***@example.com',
      });
      expect(response).not.toHaveProperty('gatewayTransactionId');
    });

    it('sends a null idempotency key when the header is missing', async () => {
      create.execute.mockResolvedValue(ok(buildTransaction()));

      await controller.create(body);

      expect(create.execute).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: null }),
      );
    });

    it('rejects an idempotency key that is too long', async () => {
      await expect(controller.create(body, 'k'.repeat(101))).rejects.toThrow(
        BadRequestException,
      );
      expect(create.execute).not.toHaveBeenCalled();
    });

    it('maps business errors to HTTP', async () => {
      create.execute.mockResolvedValue(err(conflict('no stock')));

      await expect(controller.create(body)).rejects.toThrow(ConflictException);
    });
  });

  describe('GET /transactions/:id', () => {
    it('returns the transaction', async () => {
      get.execute.mockResolvedValue(ok(buildTransaction()));

      const response = await controller.findOne(TX_ID);

      expect(response.id).toBe(TX_ID);
    });

    it('maps NOT_FOUND to 404', async () => {
      get.execute.mockResolvedValue(err(notFound('missing')));

      await expect(controller.findOne(TX_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
