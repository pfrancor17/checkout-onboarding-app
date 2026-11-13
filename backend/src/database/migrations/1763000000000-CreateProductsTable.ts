import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1763000000000 implements MigrationInterface {
  name = 'CreateProductsTable1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "sku"            VARCHAR(40)  NOT NULL UNIQUE,
        "name"           VARCHAR(120) NOT NULL,
        "description"    TEXT         NOT NULL,
        "price_in_cents" INTEGER      NOT NULL CHECK ("price_in_cents" > 0),
        "currency"       CHAR(3)      NOT NULL DEFAULT 'COP',
        "stock"          INTEGER      NOT NULL DEFAULT 0 CHECK ("stock" >= 0),
        "image_url"      VARCHAR(500),
        "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
