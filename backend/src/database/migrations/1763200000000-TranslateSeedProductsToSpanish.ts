import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The UI is in Spanish, so the demo products are too.
 * The seed never overwrites existing rows (it would reset the stock), so
 * databases seeded earlier are updated here, matching by SKU. Stock and
 * prices are not touched.
 */
const TRANSLATIONS = [
  {
    sku: 'HEADPHONES-BT-01',
    es: {
      name: 'Audífonos inalámbricos',
      description:
        'Audífonos de diadema con Bluetooth, cancelación activa de ruido y hasta 30 horas de batería.',
    },
    en: {
      name: 'Wireless Headphones',
      description:
        'Over-ear Bluetooth headphones with active noise cancelling and 30 hours of battery life.',
    },
  },
  {
    sku: 'SMARTWATCH-02',
    es: {
      name: 'Reloj inteligente',
      description:
        'Reloj resistente al agua con monitor de ritmo cardíaco, GPS y seguimiento del sueño.',
    },
    en: {
      name: 'Smart Watch',
      description:
        'Water-resistant smart watch with heart-rate monitor, GPS and sleep tracking.',
    },
  },
  {
    sku: 'SPEAKER-PORT-03',
    es: {
      name: 'Parlante portátil',
      description:
        'Parlante compacto y resistente al agua, con bajos potentes y 12 horas de reproducción.',
    },
    en: {
      name: 'Portable Speaker',
      description:
        'Compact waterproof speaker with deep bass and 12 hours of playback.',
    },
  },
];

export class TranslateSeedProductsToSpanish1763200000000 implements MigrationInterface {
  name = 'TranslateSeedProductsToSpanish1763200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { sku, es } of TRANSLATIONS) {
      await queryRunner.query(
        `UPDATE "products" SET "name" = $1, "description" = $2, "updated_at" = now() WHERE "sku" = $3`,
        [es.name, es.description, sku],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { sku, en } of TRANSLATIONS) {
      await queryRunner.query(
        `UPDATE "products" SET "name" = $1, "description" = $2, "updated_at" = now() WHERE "sku" = $3`,
        [en.name, en.description, sku],
      );
    }
  }
}
