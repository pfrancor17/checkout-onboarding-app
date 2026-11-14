import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../shared/domain/app-error';
import { Result } from '../../shared/domain/result';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../products/domain/product.repository';
import {
  Amounts,
  calculateAmounts,
  CHECKOUT_FEES,
  type CheckoutFees,
} from '../domain/transaction';
import { findAvailableProduct } from './find-available-product';

/** Price breakdown shown on the summary screen before paying. */
@Injectable()
export class GetQuoteUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(CHECKOUT_FEES) private readonly fees: CheckoutFees,
  ) {}

  async execute(
    productId: string,
    quantity: number,
  ): Promise<Result<Amounts, AppError>> {
    const product = await findAvailableProduct(
      this.products,
      productId,
      quantity,
    );
    return product.map((p) =>
      calculateAmounts(p.priceInCents, quantity, p.currency, this.fees),
    );
  }
}
