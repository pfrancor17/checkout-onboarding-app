import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetCustomerUseCase } from './application/get-customer.use-case';
import { CUSTOMER_REPOSITORY } from './domain/customer';
import { CustomersController } from './infrastructure/http/customers.controller';
import { CustomerOrmEntity } from './infrastructure/persistence/customer.orm-entity';
import { TypeOrmCustomerRepository } from './infrastructure/persistence/typeorm-customer.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerOrmEntity])],
  controllers: [CustomersController],
  providers: [
    GetCustomerUseCase,
    { provide: CUSTOMER_REPOSITORY, useClass: TypeOrmCustomerRepository },
  ],
})
export class CustomersModule {}
