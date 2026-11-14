import type { Product } from './types';

export const buildProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  name: 'Smart Watch',
  description: 'Water-resistant smart watch.',
  priceInCents: 35_900_000,
  currency: 'COP',
  stock: 10,
  available: true,
  imageUrl: 'https://img.test/watch.jpg',
  ...overrides,
});
