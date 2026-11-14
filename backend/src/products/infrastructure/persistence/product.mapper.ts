import { Product } from '../../domain/product';
import { ProductOrmEntity } from './product.orm-entity';

export const toDomainProduct = (entity: ProductOrmEntity): Product =>
  Product.fromProps({
    id: entity.id,
    sku: entity.sku,
    name: entity.name,
    description: entity.description,
    priceInCents: entity.priceInCents,
    currency: entity.currency,
    stock: entity.stock,
    imageUrl: entity.imageUrl,
  });
