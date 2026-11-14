import { Product } from './product';

/** Output port: how the domain expects to read products. */
export interface ProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
