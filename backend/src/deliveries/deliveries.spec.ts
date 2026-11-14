import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { notFound } from '../shared/domain/app-error';
import { err, ok } from '../shared/domain/result';
import { GetDeliveryUseCase } from './application/get-delivery.use-case';
import { Delivery, DeliveryRepository } from './domain/delivery';
import { DeliveriesController } from './infrastructure/http/deliveries.controller';
import { DeliveryOrmEntity } from './infrastructure/persistence/delivery.orm-entity';
import { TypeOrmDeliveryRepository } from './infrastructure/persistence/typeorm-delivery.repository';

const delivery: Delivery = {
  id: 'del-1',
  transactionId: 'tx-1',
  status: 'ASSIGNED',
  recipientName: 'Jane Doe',
  phone: '3001234567',
  addressLine1: 'Calle 10 # 20-30',
  addressLine2: null,
  city: 'Medellín',
  region: 'Antioquia',
  postalCode: '050021',
  country: 'CO',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('Deliveries', () => {
  describe('GetDeliveryUseCase', () => {
    const repository: jest.Mocked<DeliveryRepository> = { findById: jest.fn() };
    const useCase = new GetDeliveryUseCase(repository);

    it('returns the delivery', async () => {
      repository.findById.mockResolvedValue(delivery);
      const result = await useCase.execute('del-1');
      expect(result.isOk && result.value).toBe(delivery);
    });

    it('returns NOT_FOUND', async () => {
      repository.findById.mockResolvedValue(null);
      const result = await useCase.execute('x');
      expect(result.isErr && result.error.code).toBe('NOT_FOUND');
    });

    it('returns UNEXPECTED when the repository fails', async () => {
      repository.findById.mockRejectedValue(new Error('db'));
      const result = await useCase.execute('x');
      expect(result.isErr && result.error.code).toBe('UNEXPECTED');
    });
  });

  describe('TypeOrmDeliveryRepository', () => {
    const orm = { findOneBy: jest.fn() };
    const repository = new TypeOrmDeliveryRepository(
      orm as unknown as Repository<DeliveryOrmEntity>,
    );

    it('maps the entity', async () => {
      orm.findOneBy.mockResolvedValue({ ...delivery, transaction: {} });
      await expect(repository.findById('del-1')).resolves.toEqual(delivery);
    });

    it('returns null when missing', async () => {
      orm.findOneBy.mockResolvedValue(null);
      await expect(repository.findById('x')).resolves.toBeNull();
    });
  });

  describe('DeliveriesController', () => {
    const useCase = { execute: jest.fn() };
    const controller = new DeliveriesController(
      useCase as unknown as GetDeliveryUseCase,
    );

    it('returns the delivery with the phone masked', async () => {
      useCase.execute.mockResolvedValue(ok(delivery));

      const response = await controller.findOne('del-1');

      expect(response).toEqual({ ...delivery, phone: '******4567' });
    });

    it('maps NOT_FOUND to 404', async () => {
      useCase.execute.mockResolvedValue(err(notFound('missing')));

      await expect(controller.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });
});
