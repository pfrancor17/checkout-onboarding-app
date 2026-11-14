import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckoutTables1763100000000 implements MigrationInterface {
  name = 'CreateCheckoutTables1763100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "full_name"  VARCHAR(120) NOT NULL,
        "email"      VARCHAR(254) NOT NULL UNIQUE,
        "phone"      VARCHAR(20)  NOT NULL,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "reference"               VARCHAR(64)  NOT NULL UNIQUE,
        "idempotency_key"         VARCHAR(100) UNIQUE,
        "product_id"              UUID NOT NULL REFERENCES "products"("id"),
        "customer_id"             UUID NOT NULL REFERENCES "customers"("id"),
        "quantity"                INTEGER NOT NULL CHECK ("quantity" > 0),
        "unit_price_in_cents"     INTEGER NOT NULL CHECK ("unit_price_in_cents" > 0),
        "product_amount_in_cents" INTEGER NOT NULL CHECK ("product_amount_in_cents" > 0),
        "base_fee_in_cents"       INTEGER NOT NULL CHECK ("base_fee_in_cents" >= 0),
        "delivery_fee_in_cents"   INTEGER NOT NULL CHECK ("delivery_fee_in_cents" >= 0),
        "total_amount_in_cents"   INTEGER NOT NULL CHECK ("total_amount_in_cents" > 0),
        "currency"                CHAR(3) NOT NULL,
        "status"                  VARCHAR(10) NOT NULL DEFAULT 'PENDING'
          CHECK ("status" IN ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR')),
        "status_message"          VARCHAR(255),
        "gateway_transaction_id"  VARCHAR(64) UNIQUE,
        "card_brand"              VARCHAR(20) NOT NULL,
        "card_last_four"          CHAR(4) NOT NULL,
        "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_transactions_customer_id" ON "transactions" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_transactions_status" ON "transactions" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "deliveries" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "transaction_id" UUID NOT NULL UNIQUE REFERENCES "transactions"("id") ON DELETE CASCADE,
        "recipient_name" VARCHAR(120) NOT NULL,
        "phone"          VARCHAR(20)  NOT NULL,
        "address_line_1" VARCHAR(200) NOT NULL,
        "address_line_2" VARCHAR(200),
        "city"           VARCHAR(80)  NOT NULL,
        "region"         VARCHAR(80)  NOT NULL,
        "postal_code"    VARCHAR(10),
        "country"        CHAR(2)      NOT NULL DEFAULT 'CO',
        "status"         VARCHAR(10)  NOT NULL DEFAULT 'PENDING'
          CHECK ("status" IN ('PENDING', 'ASSIGNED', 'CANCELLED')),
        "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "deliveries"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "customers"`);
  }
}
