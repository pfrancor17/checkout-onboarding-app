import { Inject, Injectable } from '@nestjs/common';
import { AppError, unexpected } from '../../shared/domain/app-error';
import { fromPromise, Result } from '../../shared/domain/result';
import { Product } from '../domain/product';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../domain/product.repository';

@Injectable()
export class GetProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  execute(): Promise<Result<Product[], AppError>> {
    return fromPromise(this.products.findAll(), unexpected);
  }
}
