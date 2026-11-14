import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { toHttpException } from '../../../shared/infrastructure/http/app-error.mapper';
import { GetProductByIdUseCase } from '../../application/get-product-by-id.use-case';
import { GetProductsUseCase } from '../../application/get-products.use-case';
import { ProductResponseDto } from './product-response.dto';

/**
 * Driving adapter: translates HTTP into use case calls and back.
 * No business rules live here.
 */
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly getProducts: GetProductsUseCase,
    private readonly getProductById: GetProductByIdUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ type: ProductResponseDto, isArray: true })
  async findAll(): Promise<ProductResponseDto[]> {
    const result = await this.getProducts.execute();
    return result.match({
      ok: (products) =>
        products.map((product) => ProductResponseDto.fromDomain(product)),
      err: (error) => {
        throw toHttpException(error);
      },
    });
  }

  @Get(':id')
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse({ description: 'The id is not a valid UUID.' })
  @ApiNotFoundResponse({ description: 'The product does not exist.' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProductResponseDto> {
    const result = await this.getProductById.execute(id);
    return result.match({
      ok: (product) => ProductResponseDto.fromDomain(product),
      err: (error) => {
        throw toHttpException(error);
      },
    });
  }
}
