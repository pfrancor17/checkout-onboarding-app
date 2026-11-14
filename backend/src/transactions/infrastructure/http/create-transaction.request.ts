import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CARD_BRANDS,
  type CardBrand,
  MAX_UNITS_PER_ORDER,
} from '../../domain/transaction';

export class CustomerRequestDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @Length(3, 120)
  fullName!: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: '3001234567', description: '7 to 15 digits' })
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must have 7 to 15 digits' })
  phone!: string;
}

export class DeliveryRequestDto {
  @ApiProperty({ example: 'Calle 10 # 20-30' })
  @IsString()
  @Length(5, 200)
  addressLine1!: string;

  @ApiPropertyOptional({ example: 'Apto 501' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiProperty({ example: 'Medellín' })
  @IsString()
  @Length(2, 80)
  city!: string;

  @ApiProperty({ example: 'Antioquia', description: 'Department / region' })
  @IsString()
  @Length(2, 80)
  region!: string;

  @ApiPropertyOptional({ example: '050021' })
  @IsOptional()
  @Matches(/^[0-9]{6}$/, { message: 'postalCode must have 6 digits' })
  postalCode?: string;
}

export class PaymentRequestDto {
  @ApiProperty({
    description:
      'Card token created by the frontend with the gateway public key. Raw card data is never sent to this API.',
    example: 'tok_test_xxx',
  })
  @IsString()
  @Length(1, 100)
  cardToken!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 36 })
  @IsInt()
  @Min(1)
  @Max(36)
  installments!: number;

  @ApiProperty({ enum: CARD_BRANDS })
  @IsIn(CARD_BRANDS)
  cardBrand!: CardBrand;

  @ApiProperty({ example: '4242', description: 'Last 4 digits, for display' })
  @Matches(/^[0-9]{4}$/, { message: 'cardLastFour must have 4 digits' })
  cardLastFour!: string;

  @ApiProperty({ description: 'From GET /payments/acceptance-tokens' })
  @IsString()
  @Length(1, 2000)
  acceptanceToken!: string;

  @ApiProperty({ description: 'From GET /payments/acceptance-tokens' })
  @IsString()
  @Length(1, 2000)
  personalDataAuthToken!: string;
}

export class CreateTransactionRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: MAX_UNITS_PER_ORDER })
  @IsInt()
  @Min(1)
  @Max(MAX_UNITS_PER_ORDER)
  quantity!: number;

  @ApiProperty({ type: CustomerRequestDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CustomerRequestDto)
  customer!: CustomerRequestDto;

  @ApiProperty({ type: DeliveryRequestDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => DeliveryRequestDto)
  delivery!: DeliveryRequestDto;

  @ApiProperty({ type: PaymentRequestDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PaymentRequestDto)
  payment!: PaymentRequestDto;
}

export class QuoteQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: MAX_UNITS_PER_ORDER })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_UNITS_PER_ORDER)
  quantity!: number;
}
