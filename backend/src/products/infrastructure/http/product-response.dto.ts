import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../domain/product';

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Wireless Headphones' })
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({
    example: 24990000,
    description: 'Unit price in cents (24990000 = $249.900 COP)',
  })
  priceInCents!: number;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  @ApiProperty({ example: 10, description: 'Units available in stock' })
  stock!: number;

  @ApiProperty({ example: true })
  available!: boolean;

  @ApiProperty({ type: String, nullable: true })
  imageUrl!: string | null;

  static fromDomain(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      priceInCents: product.priceInCents,
      currency: product.currency,
      stock: product.stock,
      available: product.isAvailable(),
      imageUrl: product.imageUrl,
    };
  }
}
