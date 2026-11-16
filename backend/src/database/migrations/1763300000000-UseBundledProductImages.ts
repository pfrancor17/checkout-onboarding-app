import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The demo images were on an external host (picsum.photos), which can be
 * slow or unreachable. They are now bundled with the frontend and served
 * from the same domain. Matches by SKU; stock and prices are not touched.
 */
const IMAGES = [
  {
    sku: 'HEADPHONES-BT-01',
    local: '/images/products/headphones.svg',
    external: 'https://picsum.photos/seed/headphones-bt-01/600/600',
  },
  {
    sku: 'SMARTWATCH-02',
    local: '/images/products/smartwatch.svg',
    external: 'https://picsum.photos/seed/smartwatch-02/600/600',
  },
  {
    sku: 'SPEAKER-PORT-03',
    local: '/images/products/speaker.svg',
    external: 'https://picsum.photos/seed/speaker-port-03/600/600',
  },
];

export class UseBundledProductImages1763300000000 implements MigrationInterface {
  name = 'UseBundledProductImages1763300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { sku, local } of IMAGES) {
      await queryRunner.query(
        `UPDATE "products" SET "image_url" = $1, "updated_at" = now() WHERE "sku" = $2`,
        [local, sku],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { sku, external } of IMAGES) {
      await queryRunner.query(
        `UPDATE "products" SET "image_url" = $1, "updated_at" = now() WHERE "sku" = $2`,
        [external, sku],
      );
    }
  }
}
