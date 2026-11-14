import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerOrmEntity } from '../../../customers/infrastructure/persistence/customer.orm-entity';
import { DeliveryOrmEntity } from '../../../deliveries/infrastructure/persistence/delivery.orm-entity';
import { ProductOrmEntity } from '../../../products/infrastructure/persistence/product.orm-entity';
import type { CardBrand, TransactionStatus } from '../../domain/transaction';

@Entity({ name: 'transactions' })
export class TransactionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  reference!: string;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => ProductOrmEntity)
  @JoinColumn({ name: 'product_id' })
  product?: ProductOrmEntity;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => CustomerOrmEntity)
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerOrmEntity;

  @OneToOne(() => DeliveryOrmEntity, (delivery) => delivery.transaction)
  delivery?: DeliveryOrmEntity;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'unit_price_in_cents', type: 'integer' })
  unitPriceInCents!: number;

  @Column({ name: 'product_amount_in_cents', type: 'integer' })
  productAmountInCents!: number;

  @Column({ name: 'base_fee_in_cents', type: 'integer' })
  baseFeeInCents!: number;

  @Column({ name: 'delivery_fee_in_cents', type: 'integer' })
  deliveryFeeInCents!: number;

  @Column({ name: 'total_amount_in_cents', type: 'integer' })
  totalAmountInCents!: number;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'varchar', length: 10, default: 'PENDING' })
  status!: TransactionStatus;

  @Column({
    name: 'status_message',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  statusMessage!: string | null;

  @Column({
    name: 'gateway_transaction_id',
    type: 'varchar',
    length: 64,
    unique: true,
    nullable: true,
  })
  gatewayTransactionId!: string | null;

  @Column({ name: 'card_brand', type: 'varchar', length: 20 })
  cardBrand!: CardBrand;

  @Column({ name: 'card_last_four', type: 'char', length: 4 })
  cardLastFour!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
