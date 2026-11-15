import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { parsePaymentEvent } from '../../../payments/infrastructure/payment-event.parser';
import { PAYMENT_EVENTS_SECRET } from '../../../payments/infrastructure/payment-gateway.config';
import { toHttpException } from '../../../shared/infrastructure/http/app-error.mapper';
import {
  HandlePaymentEventUseCase,
  type PaymentEventOutcome,
} from '../../application/handle-payment-event.use-case';

export class PaymentEventReceivedDto {
  @ApiProperty({ example: true })
  received!: true;

  @ApiProperty({
    enum: [
      'SETTLED',
      'ALREADY_SETTLED',
      'STILL_PENDING',
      'IGNORED_UNKNOWN_REFERENCE',
      'IGNORED_AMOUNT_MISMATCH',
      'IGNORED_EVENT_TYPE',
    ],
  })
  outcome!: PaymentEventOutcome | 'IGNORED_EVENT_TYPE';
}

/**
 * Webhook the payment gateway calls when a payment changes status.
 * Driving adapter: verifies the signature, then hands a domain event to
 * the use case. Answers 200 for every verified event (even ignored ones)
 * so the gateway does not keep retrying it.
 */
@ApiTags('webhooks')
@Controller('webhooks')
export class PaymentEventsController {
  constructor(
    @Inject(PAYMENT_EVENTS_SECRET) private readonly eventsSecret: string,
    private readonly handlePaymentEvent: HandlePaymentEventUseCase,
  ) {}

  @Post('payment-events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Payment status events from the gateway (signed)',
    description:
      'The signature (SHA-256 of the listed properties + timestamp + events secret) is verified before anything else.',
  })
  @ApiBody({
    schema: {
      example: {
        event: 'transaction.updated',
        data: {
          transaction: {
            id: '15113-1794621905-32229',
            reference: '1481a485-65ec-4e58-8368-3e19c5925649',
            status: 'APPROVED',
            amount_in_cents: 16750000,
          },
        },
        signature: {
          properties: [
            'transaction.id',
            'transaction.status',
            'transaction.amount_in_cents',
          ],
          checksum: '<sha256>',
        },
        timestamp: 1794621905,
      },
    },
  })
  @ApiOkResponse({ type: PaymentEventReceivedDto })
  @ApiUnauthorizedResponse({ description: 'Invalid signature.' })
  @ApiUnprocessableEntityResponse({ description: 'Malformed event.' })
  async receive(@Body() body: unknown): Promise<PaymentEventReceivedDto> {
    const parsed = parsePaymentEvent(body, this.eventsSecret);
    if (parsed.isErr) throw toHttpException(parsed.error);
    if (!parsed.value) return { received: true, outcome: 'IGNORED_EVENT_TYPE' };

    const result = await this.handlePaymentEvent.execute(parsed.value);
    return result.match({
      ok: (outcome) => ({ received: true as const, outcome }),
      err: (error) => {
        throw toHttpException(error);
      },
    });
  }
}
