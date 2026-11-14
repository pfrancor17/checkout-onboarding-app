import {
  AppError,
  conflict,
  notFound,
  unexpected,
  validationError,
} from '../../shared/domain/app-error';
import { err, fromPromise, ok, Result } from '../../shared/domain/result';
import { Product } from '../../products/domain/product';
import { ProductRepository } from '../../products/domain/product.repository';
import { MAX_UNITS_PER_ORDER } from '../domain/transaction';

/** Step shared by the quote and the checkout: the product can be sold. */
export const findAvailableProduct = async (
  products: ProductRepository,
  productId: string,
  quantity: number,
): Promise<Result<Product, AppError>> => {
  const found = await fromPromise(products.findById(productId), unexpected);

  return found.andThen((product) => {
    if (!product) {
      return err(notFound(`Product ${productId} was not found`));
    }
    if (quantity > MAX_UNITS_PER_ORDER) {
      return err(
        validationError(
          `You can buy up to ${MAX_UNITS_PER_ORDER} units per order`,
        ),
      );
    }
    if (!product.canFulfill(quantity)) {
      return err(
        conflict(
          `Only ${product.stock} unit(s) of ${product.name} are available`,
        ),
      );
    }
    return ok(product);
  });
};
