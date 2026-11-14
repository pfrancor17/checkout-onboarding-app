import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { toHttpException } from '../../../shared/infrastructure/http/app-error.mapper';
import { GetQuoteUseCase } from '../../application/get-quote.use-case';
import { QuoteQueryDto } from './create-transaction.request';
import { AmountsResponseDto } from './transaction.response';

@ApiTags('quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly getQuote: GetQuoteUseCase) {}

  @Get()
  @ApiOkResponse({
    type: AmountsResponseDto,
    description:
      'Price breakdown for the summary screen: product amount, base fee and delivery fee.',
  })
  @ApiBadRequestResponse({ description: 'Invalid productId or quantity.' })
  @ApiNotFoundResponse({ description: 'The product does not exist.' })
  @ApiConflictResponse({ description: 'Not enough stock.' })
  async quote(@Query() query: QuoteQueryDto): Promise<AmountsResponseDto> {
    const result = await this.getQuote.execute(query.productId, query.quantity);
    return result.match({
      ok: (amounts) => AmountsResponseDto.fromDomain(amounts),
      err: (error) => {
        throw toHttpException(error);
      },
    });
  }
}
