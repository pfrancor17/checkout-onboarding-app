import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery, DeliveryRepository } from '../../domain/delivery';
import { DeliveryOrmEntity } from './delivery.orm-entity';

@Injectable()
export class TypeOrmDeliveryRepository implements DeliveryRepository {
  constructor(
    @InjectRepository(DeliveryOrmEntity)
    private readonly repository: Repository<DeliveryOrmEntity>,
  ) {}

  async findById(id: string): Promise<Delivery | null> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) return null;
    return {
      id: entity.id,
      transactionId: entity.transactionId,
      status: entity.status,
      recipientName: entity.recipientName,
      phone: entity.phone,
      addressLine1: entity.addressLine1,
      addressLine2: entity.addressLine2,
      city: entity.city,
      region: entity.region,
      postalCode: entity.postalCode,
      country: entity.country,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
