import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { GetAcceptanceTokensUseCase } from '../src/payments/application/get-acceptance-tokens.use-case';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
} from '../src/payments/domain/payment-gateway.port';
import { PaymentsController } from '../src/payments/infrastructure/http/payments.controller';
import { paymentGatewayError } from '../src/shared/domain/app-error';
import { err, ok } from '../src/shared/domain/result';

describe('Payments (e2e)', () => {
  let app: INestApplication<App>;
  const gateway: jest.Mocked<PaymentGateway> = {
    getAcceptanceTokens: jest.fn(),
    createCardPayment: jest.fn(),
    getTransaction: jest.fn(),
  };

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        GetAcceptanceTokensUseCase,
        { provide: PAYMENT_GATEWAY, useValue: gateway },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/payments/acceptance-tokens -> 200', async () => {
    const tokens = {
      acceptanceToken: 'acc',
      termsUrl: 'https://terms.pdf',
      personalDataAuthToken: 'personal',
      personalDataPolicyUrl: 'https://personal.pdf',
    };
    gateway.getAcceptanceTokens.mockResolvedValue(ok(tokens));

    const res = await request(app.getHttpServer())
      .get('/api/payments/acceptance-tokens')
      .expect(200);

    expect(res.body).toEqual(tokens);
  });

  it('GET /api/payments/acceptance-tokens -> 502 when the gateway fails', () => {
    gateway.getAcceptanceTokens.mockResolvedValue(
      err(paymentGatewayError('Payment gateway is unreachable')),
    );

    return request(app.getHttpServer())
      .get('/api/payments/acceptance-tokens')
      .expect(502);
  });
});
