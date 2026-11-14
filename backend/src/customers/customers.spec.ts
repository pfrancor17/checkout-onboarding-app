import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { notFound } from '../shared/domain/app-error';
import { err, ok } from '../shared/domain/result';
import { GetCustomerUseCase } from './application/get-customer.use-case';
import { Customer, CustomerRepository } from './domain/customer';
import { CustomersController } from './infrastructure/http/customers.controller';
import { CustomerOrmEntity } from './infrastructure/persistence/customer.orm-entity';
import { TypeOrmCustomerRepository } from './infrastructure/persistence/typeorm-customer.repository';

const customer: Customer = {
  id: 'cust-1',
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '3001234567',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('Customers', () => {
  describe('GetCustomerUseCase', () => {
    const repository: jest.Mocked<CustomerRepository> = { findById: jest.fn() };
    const useCase = new GetCustomerUseCase(repository);

    it('returns the customer', async () => {
      repository.findById.mockResolvedValue(customer);
      const result = await useCase.execute('cust-1');
      expect(result.isOk && result.value).toBe(customer);
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

  describe('TypeOrmCustomerRepository', () => {
    const orm = { findOneBy: jest.fn() };
    const repository = new TypeOrmCustomerRepository(
      orm as unknown as Repository<CustomerOrmEntity>,
    );

    it('maps the entity', async () => {
      orm.findOneBy.mockResolvedValue({ ...customer, updatedAt: new Date() });
      await expect(repository.findById('cust-1')).resolves.toEqual(customer);
      expect(orm.findOneBy).toHaveBeenCalledWith({ id: 'cust-1' });
    });

    it('returns null when missing', async () => {
      orm.findOneBy.mockResolvedValue(null);
      await expect(repository.findById('x')).resolves.toBeNull();
    });
  });

  describe('CustomersController', () => {
    const useCase = { execute: jest.fn() };
    const controller = new CustomersController(
      useCase as unknown as GetCustomerUseCase,
    );

    it('returns the customer with masked email and phone', async () => {
      useCase.execute.mockResolvedValue(ok(customer));

      await expect(controller.findOne('cust-1')).resolves.toEqual({
        id: 'cust-1',
        fullName: 'Jane Doe',
        email: 'j***@example.com',
        phone: '******4567',
        createdAt: customer.createdAt,
      });
    });

    it('maps NOT_FOUND to 404', async () => {
      useCase.execute.mockResolvedValue(err(notFound('missing')));

      await expect(controller.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });
});
