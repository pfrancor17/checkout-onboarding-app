import { Controller, Get } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { toHttpException } from '../../../shared/infrastructure/http/app-error.mapper';
import { GetAcceptanceTokensUseCase } from '../../application/get-acceptance-tokens.use-case';
import { AcceptanceTokensResponseDto } from './acceptance-tokens-response.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly getAcceptanceTokens: GetAcceptanceTokensUseCase,
  ) {}

  @Get('acceptance-tokens')
  @ApiOkResponse({ type: AcceptanceTokensResponseDto })
  @ApiBadGatewayResponse({ description: 'The payment gateway failed.' })
  async acceptanceTokens(): Promise<AcceptanceTokensResponseDto> {
    const result = await this.getAcceptanceTokens.execute();
    return result.match({
      ok: (tokens) => AcceptanceTokensResponseDto.fromDomain(tokens),
      err: (error) => {
        throw toHttpException(error);
      },
    });
  }
}
