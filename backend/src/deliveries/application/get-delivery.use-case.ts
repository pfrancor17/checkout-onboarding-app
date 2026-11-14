import { Inject, Injectable } from '@nestjs/common';
import { AppError, notFound, unexpected } from '../../shared/domain/app-error';
import { err, fromPromise, ok, Result } from '../../shared/domain/result';
import {
  Delivery,
  DELIVERY_REPOSITORY,
  type DeliveryRepository,
} from '../domain/delivery';

@Injectable()
export class GetDeliveryUseCase {
  constructor(
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveries: DeliveryRepository,
  ) {}

  async execute(id: string): Promise<Result<Delivery, AppError>> {
    const found = await fromPromise(this.deliveries.findById(id), unexpected);
    return found.andThen((delivery) =>
      delivery ? ok(delivery) : err(notFound(`Delivery ${id} was not found`)),
    );
  }
}
