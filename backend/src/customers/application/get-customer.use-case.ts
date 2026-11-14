import { Inject, Injectable } from '@nestjs/common';
import { AppError, notFound, unexpected } from '../../shared/domain/app-error';
import { err, fromPromise, ok, Result } from '../../shared/domain/result';
import {
  Customer,
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../domain/customer';

@Injectable()
export class GetCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: CustomerRepository,
  ) {}

  async execute(id: string): Promise<Result<Customer, AppError>> {
    const found = await fromPromise(this.customers.findById(id), unexpected);
    return found.andThen((customer) =>
      customer ? ok(customer) : err(notFound(`Customer ${id} was not found`)),
    );
  }
}
