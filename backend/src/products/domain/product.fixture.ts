import { Product, ProductProps } from './product';

/** Test helper: builds a valid product, overriding only what a test needs. */
export const buildProduct = (overrides: Partial<ProductProps> = {}): Product =>
  Product.fromProps({
    id: '6f1c3b5e-8a4d-4b8e-9c2a-1d2e3f4a5b6c',
    sku: 'TEST-SKU-01',
    name: 'Test Product',
    description: 'A product used in tests',
    priceInCents: 10_000_00,
    currency: 'COP',
    stock: 5,
    imageUrl: null,
    ...overrides,
  });
