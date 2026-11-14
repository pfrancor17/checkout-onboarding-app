import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { maskPhone } from '../../../shared/domain/masking';
import { toHttpException } from '../../../shared/infrastructure/http/app-error.mapper';
import {
  DELIVERY_STATUSES,
  type DeliveryStatus,
} from '../../../transactions/domain/transaction';
import { GetDeliveryUseCase } from '../../application/get-delivery.use-case';
import { Delivery } from '../../domain/delivery';

export class DeliveryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  transactionId!: string;

  @ApiProperty({
    enum: DELIVERY_STATUSES,
    description:
      'PENDING while the payment is in progress, ASSIGNED once paid, CANCELLED if the payment failed',
  })
  status!: DeliveryStatus;

  @ApiProperty({ example: 'Jane Doe' })
  recipientName!: string;

  @ApiProperty({ example: '******4567', description: 'Masked' })
  phone!: string;

  @ApiProperty({ example: 'Calle 10 # 20-30' })
  addressLine1!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Apto 501' })
  addressLine2!: string | null;

  @ApiProperty({ example: 'Medellín' })
  city!: string;

  @ApiProperty({ example: 'Antioquia' })
  region!: string;

  @ApiProperty({ type: String, nullable: true, example: '050021' })
  postalCode!: string | null;

  @ApiProperty({ example: 'CO' })
  country!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromDomain(delivery: Delivery): DeliveryResponseDto {
    return { ...delivery, phone: maskPhone(delivery.phone) };
  }
}

@ApiTags('deliveries')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly getDelivery: GetDeliveryUseCase) {}

  @Get(':id')
  @ApiOkResponse({ type: DeliveryResponseDto })
  @ApiBadRequestResponse({ description: 'The id is not a valid UUID.' })
  @ApiNotFoundResponse({ description: 'The delivery does not exist.' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<DeliveryResponseDto> {
    const result = await this.getDelivery.execute(id);
    return result.match({
      ok: (delivery) => DeliveryResponseDto.fromDomain(delivery),
      err: (error) => {
        throw toHttpException(error);
      },
    });
  }
}
