import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, CustomerRepository } from '../../domain/customer';
import { CustomerOrmEntity } from './customer.orm-entity';

@Injectable()
export class TypeOrmCustomerRepository implements CustomerRepository {
  constructor(
    @InjectRepository(CustomerOrmEntity)
    private readonly repository: Repository<CustomerOrmEntity>,
  ) {}

  async findById(id: string): Promise<Customer | null> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) return null;
    return {
      id: entity.id,
      fullName: entity.fullName,
      email: entity.email,
      phone: entity.phone,
      createdAt: entity.createdAt,
    };
  }
}
