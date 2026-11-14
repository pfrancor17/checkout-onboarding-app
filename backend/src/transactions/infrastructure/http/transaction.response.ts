import { ApiProperty } from '@nestjs/swagger';
import { PAYMENT_STATUSES } from '../../../payments/domain/payment-gateway.port';
import { maskEmail } from '../../../shared/domain/masking';
import {
  Amounts,
  CARD_BRANDS,
  type CardBrand,
  DELIVERY_STATUSES,
  type DeliveryStatus,
  TransactionDetails,
  type TransactionStatus,
} from '../../domain/transaction';

export class AmountsResponseDto {
  @ApiProperty({ example: 24990000 })
  unitPriceInCents!: number;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 24990000 })
  productAmountInCents!: number;

  @ApiProperty({ example: 300000, description: 'Always charged' })
  baseFeeInCents!: number;

  @ApiProperty({ example: 1000000 })
  deliveryFeeInCents!: number;

  @ApiProperty({ example: 26290000 })
  totalAmountInCents!: number;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  static fromDomain(amounts: Amounts): AmountsResponseDto {
    return { ...amounts };
  }
}

class TransactionProductDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Wireless Headphones' })
  name!: string;
}

class CardSummaryDto {
  @ApiProperty({ enum: CARD_BRANDS })
  brand!: CardBrand;

  @ApiProperty({ example: '4242' })
  lastFour!: string;
}

class TransactionCustomerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  fullName!: string;

  @ApiProperty({ example: 'j***@example.com', description: 'Masked' })
  email!: string;
}

class TransactionDeliveryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: DELIVERY_STATUSES })
  status!: DeliveryStatus;

  @ApiProperty({ example: 'Calle 10 # 20-30' })
  addressLine1!: string;

  @ApiProperty({ type: String, nullable: true })
  addressLine2!: string | null;

  @ApiProperty({ example: 'Medellín' })
  city!: string;

  @ApiProperty({ example: 'Antioquia' })
  region!: string;

  @ApiProperty({ type: String, nullable: true })
  postalCode!: string | null;
}

export class TransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Reference sent to the payment gateway' })
  reference!: string;

  @ApiProperty({ enum: PAYMENT_STATUSES })
  status!: TransactionStatus;

  @ApiProperty({ type: String, nullable: true })
  statusMessage!: string | null;

  @ApiProperty({ type: TransactionProductDto })
  product!: TransactionProductDto;

  @ApiProperty({ type: AmountsResponseDto })
  amounts!: AmountsResponseDto;

  @ApiProperty({ type: CardSummaryDto })
  card!: CardSummaryDto;

  @ApiProperty({ type: TransactionCustomerDto })
  customer!: TransactionCustomerDto;

  @ApiProperty({ type: TransactionDeliveryDto })
  delivery!: TransactionDeliveryDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  /** The gateway id and the customer's phone are internal: not exposed. */
  static fromDomain(transaction: TransactionDetails): TransactionResponseDto {
    return {
      id: transaction.id,
      reference: transaction.reference,
      status: transaction.status,
      statusMessage: transaction.statusMessage,
      product: transaction.product,
      amounts: AmountsResponseDto.fromDomain(transaction.amounts),
      card: transaction.card,
      customer: {
        id: transaction.customer.id,
        fullName: transaction.customer.fullName,
        email: maskEmail(transaction.customer.email),
      },
      delivery: transaction.delivery,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
