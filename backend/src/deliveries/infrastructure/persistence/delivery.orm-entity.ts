import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { DeliveryStatus } from '../../../transactions/domain/transaction';
import { TransactionOrmEntity } from '../../../transactions/infrastructure/persistence/transaction.orm-entity';

@Entity({ name: 'deliveries' })
export class DeliveryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transaction_id', type: 'uuid', unique: true })
  transactionId!: string;

  @OneToOne(() => TransactionOrmEntity, (transaction) => transaction.delivery)
  @JoinColumn({ name: 'transaction_id' })
  transaction?: TransactionOrmEntity;

  @Column({ name: 'recipient_name', type: 'varchar', length: 120 })
  recipientName!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ name: 'address_line_1', type: 'varchar', length: 200 })
  addressLine1!: string;

  @Column({
    name: 'address_line_2',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  addressLine2!: string | null;

  @Column({ type: 'varchar', length: 80 })
  city!: string;

  @Column({ type: 'varchar', length: 80 })
  region!: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 10, nullable: true })
  postalCode!: string | null;

  @Column({ type: 'char', length: 2, default: 'CO' })
  country!: string;

  @Column({ type: 'varchar', length: 10, default: 'PENDING' })
  status!: DeliveryStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
