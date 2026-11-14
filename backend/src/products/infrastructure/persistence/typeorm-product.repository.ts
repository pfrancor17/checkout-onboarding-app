import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../domain/product';
import { ProductRepository } from '../../domain/product.repository';
import { toDomainProduct } from './product.mapper';
import { ProductOrmEntity } from './product.orm-entity';

/** Adapter: implements the ProductRepository port with TypeORM/PostgreSQL. */
@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly repository: Repository<ProductOrmEntity>,
  ) {}

  async findAll(): Promise<Product[]> {
    const entities = await this.repository.find({ order: { name: 'ASC' } });
    return entities.map(toDomainProduct);
  }

  async findById(id: string): Promise<Product | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? toDomainProduct(entity) : null;
  }
}
