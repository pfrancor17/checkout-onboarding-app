import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { toHttpException } from '../../../shared/infrastructure/http/app-error.mapper';
import { CreateTransactionUseCase } from '../../application/create-transaction.use-case';
import { GetTransactionUseCase } from '../../application/get-transaction.use-case';
import { CreateTransactionRequestDto } from './create-transaction.request';
import { TransactionResponseDto } from './transaction.response';

const MAX_IDEMPOTENCY_KEY_LENGTH = 100;

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly getTransaction: GetTransactionUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Unique key per checkout attempt. Retrying with the same key returns the original transaction instead of charging twice.',
  })
  @ApiCreatedResponse({
    type: TransactionResponseDto,
    description:
      'Transaction created. Its status is the payment result (APPROVED, DECLINED, ERROR) or PENDING if the gateway is still processing it.',
  })
  @ApiBadRequestResponse({ description: 'Invalid body.' })
  @ApiNotFoundResponse({ description: 'The product does not exist.' })
  @ApiConflictResponse({ description: 'Not enough stock.' })
  @ApiUnprocessableEntityResponse({ description: 'Business rule violated.' })
  @ApiBadGatewayResponse({ description: 'The payment gateway failed.' })
  async create(
    @Body() body: CreateTransactionRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<TransactionResponseDto> {
    if (idempotencyKey && idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      throw new BadRequestException(
        `Idempotency-Key must have at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
      );
    }

    const result = await this.createTransaction.execute({
      productId: body.productId,
      quantity: body.quantity,
      idempotencyKey: idempotencyKey ?? null,
      customer: body.customer,
      delivery: {
        addressLine1: body.delivery.addressLine1,
        addressLine2: body.delivery.addressLine2 ?? null,
        city: body.delivery.city,
        region: body.delivery.region,
        postalCode: body.delivery.postalCode ?? null,
      },
      payment: body.payment,
    });

    return result.match({
      ok: (transaction) => TransactionResponseDto.fromDomain(transaction),
      err: (error) => {
        throw toHttpException(error);
      },
    });
  }

  @Get(':id')
  @ApiOkResponse({
    type: TransactionResponseDto,
    description:
      'Current transaction. A PENDING one is synced with the gateway first.',
  })
  @ApiBadRequestResponse({ description: 'The id is not a valid UUID.' })
  @ApiNotFoundResponse({ description: 'The transaction does not exist.' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TransactionResponseDto> {
    const result = await this.getTransaction.execute(id);
    return result.match({
      ok: (transaction) => TransactionResponseDto.fromDomain(transaction),
      err: (error) => {
        throw toHttpException(error);
      },
    });
  }
}
