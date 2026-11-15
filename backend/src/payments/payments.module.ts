import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetAcceptanceTokensUseCase } from './application/get-acceptance-tokens.use-case';
import {
  CLOCK,
  PAYMENT_POLLING_CONFIG,
  PaymentStatusPoller,
  systemClock,
} from './application/payment-status-poller';
import { PAYMENT_GATEWAY } from './domain/payment-gateway.port';
import { PaymentsController } from './infrastructure/http/payments.controller';
import { HttpPaymentGateway } from './infrastructure/http-payment-gateway';
import {
  PAYMENT_EVENTS_SECRET,
  PAYMENT_GATEWAY_CONFIG,
  paymentEventsSecretFactory,
  paymentGatewayConfigFactory,
  paymentPollingConfigFactory,
} from './infrastructure/payment-gateway.config';

@Module({
  controllers: [PaymentsController],
  providers: [
    {
      provide: PAYMENT_GATEWAY_CONFIG,
      inject: [ConfigService],
      useFactory: paymentGatewayConfigFactory,
    },
    {
      provide: PAYMENT_POLLING_CONFIG,
      inject: [ConfigService],
      useFactory: paymentPollingConfigFactory,
    },
    {
      provide: PAYMENT_EVENTS_SECRET,
      inject: [ConfigService],
      useFactory: paymentEventsSecretFactory,
    },
    { provide: CLOCK, useValue: systemClock },
    { provide: PAYMENT_GATEWAY, useClass: HttpPaymentGateway },
    GetAcceptanceTokensUseCase,
    PaymentStatusPoller,
  ],
  exports: [PAYMENT_GATEWAY, PaymentStatusPoller, CLOCK, PAYMENT_EVENTS_SECRET],
})
export class PaymentsModule {}
