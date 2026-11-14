import { Inject, Injectable } from '@nestjs/common';
import { AppError, notFound, unexpected } from '../../shared/domain/app-error';
import { err, fromPromise, ok, Result } from '../../shared/domain/result';
import { Product } from '../domain/product';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../domain/product.repository';

@Injectable()
export class GetProductByIdUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(id: string): Promise<Result<Product, AppError>> {
    const found = await fromPromise(this.products.findById(id), unexpected);

    return found.andThen((product) =>
      product ? ok(product) : err(notFound(`Product ${id} was not found`)),
    );
  }
}
