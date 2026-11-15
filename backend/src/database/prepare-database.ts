import dataSource from './data-source';
import { PRODUCT_SEEDS, seedProducts } from './seeds/products.seed';

/**
 * Runs on every container start, before the API: applies pending
 * migrations and seeds the demo products. Both steps are idempotent, so
 * restarting or redeploying never duplicates data or resets the stock.
 */
const prepare = async (): Promise<void> => {
  await dataSource.initialize();
  try {
    const migrations = await dataSource.runMigrations({ transaction: 'each' });
    console.log(`Migrations applied: ${migrations.length}`);

    const inserted = await seedProducts(dataSource);
    console.log(
      `Seed: ${inserted} new product(s), ${PRODUCT_SEEDS.length - inserted} already present.`,
    );
  } finally {
    await dataSource.destroy();
  }
};

prepare().catch((error: unknown) => {
  console.error('Database preparation failed:', error);
  process.exit(1);
});
