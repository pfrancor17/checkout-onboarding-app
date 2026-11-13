import dataSource from '../data-source';
import { PRODUCT_SEEDS, seedProducts } from './products.seed';

const run = async (): Promise<void> => {
  await dataSource.initialize();
  try {
    const inserted = await seedProducts(dataSource);
    console.log(
      `Seed completed: ${inserted} new product(s), ${PRODUCT_SEEDS.length - inserted} already present.`,
    );
  } finally {
    await dataSource.destroy();
  }
};

run().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
