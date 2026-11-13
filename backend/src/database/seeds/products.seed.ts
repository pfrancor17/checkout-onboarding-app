import { DataSource } from 'typeorm';

export interface ProductSeed {
  sku: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: 'COP';
  stock: number;
  imageUrl: string;
}

export const PRODUCT_SEEDS: ProductSeed[] = [
  {
    sku: 'HEADPHONES-BT-01',
    name: 'Wireless Headphones',
    description:
      'Over-ear Bluetooth headphones with active noise cancelling and 30 hours of battery life.',
    priceInCents: 24_990_000,
    currency: 'COP',
    stock: 10,
    imageUrl: 'https://picsum.photos/seed/headphones-bt-01/600/600',
  },
  {
    sku: 'SMARTWATCH-02',
    name: 'Smart Watch',
    description:
      'Water-resistant smart watch with heart-rate monitor, GPS and sleep tracking.',
    priceInCents: 35_900_000,
    currency: 'COP',
    stock: 5,
    imageUrl: 'https://picsum.photos/seed/smartwatch-02/600/600',
  },
  {
    sku: 'SPEAKER-PORT-03',
    name: 'Portable Speaker',
    description:
      'Compact waterproof speaker with deep bass and 12 hours of playback.',
    priceInCents: 15_450_000,
    currency: 'COP',
    stock: 20,
    imageUrl: 'https://picsum.photos/seed/speaker-port-03/600/600',
  },
];

/**
 * Inserts the dummy products. Idempotent: products that already exist
 * (same SKU) are left untouched so re-running never resets the stock.
 * Returns the number of inserted rows.
 */
export const seedProducts = async (
  dataSource: Pick<DataSource, 'query'>,
  seeds: ProductSeed[] = PRODUCT_SEEDS,
): Promise<number> => {
  let inserted = 0;

  for (const product of seeds) {
    const rows: unknown[] = await dataSource.query(
      `INSERT INTO "products"
         ("sku", "name", "description", "price_in_cents", "currency", "stock", "image_url")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("sku") DO NOTHING
       RETURNING "id"`,
      [
        product.sku,
        product.name,
        product.description,
        product.priceInCents,
        product.currency,
        product.stock,
        product.imageUrl,
      ],
    );
    inserted += rows.length;
  }

  return inserted;
};
