import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetDeliveryUseCase } from './application/get-delivery.use-case';
import { DELIVERY_REPOSITORY } from './domain/delivery';
import { DeliveriesController } from './infrastructure/http/deliveries.controller';
import { DeliveryOrmEntity } from './infrastructure/persistence/delivery.orm-entity';
import { TypeOrmDeliveryRepository } from './infrastructure/persistence/typeorm-delivery.repository';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryOrmEntity])],
  controllers: [DeliveriesController],
  providers: [
    GetDeliveryUseCase,
    { provide: DELIVERY_REPOSITORY, useClass: TypeOrmDeliveryRepository },
  ],
})
export class DeliveriesModule {}
