import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  EVENTS_SECRET,
  signedEvent,
} from '../src/payments/infrastructure/payment-event.fixture';
import { PAYMENT_EVENTS_SECRET } from '../src/payments/infrastructure/payment-gateway.config';
import { ok, err } from '../src/shared/domain/result';
import { unexpected } from '../src/shared/domain/app-error';
import { HandlePaymentEventUseCase } from '../src/transactions/application/handle-payment-event.use-case';
import { PaymentEventsController } from '../src/transactions/infrastructure/http/payment-events.controller';

describe('Payment events webhook (e2e)', () => {
  let app: INestApplication<App>;
  const handle = { execute: jest.fn() };

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentEventsController],
      providers: [
        { provide: PAYMENT_EVENTS_SECRET, useValue: EVENTS_SECRET },
        { provide: HandlePaymentEventUseCase, useValue: handle },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    // Same pipe as main.ts: the raw event body must pass through untouched.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => handle.execute.mockReset());

  const post = (body: unknown) =>
    request(app.getHttpServer())
      .post('/api/webhooks/payment-events')
      .send(body as object);

  it('200 for a signed transaction update', async () => {
    handle.execute.mockResolvedValue(ok('SETTLED'));

    const res = await post(signedEvent({ status: 'DECLINED' })).expect(200);

    expect(res.body).toEqual({ received: true, outcome: 'SETTLED' });
    expect(handle.execute).toHaveBeenCalledWith(
      expect.objectContaining({ reference: 'ref-1', status: 'DECLINED' }),
    );
  });

  it('200 (ignored) for a signed event of another type', async () => {
    const res = await post(signedEvent({ event: 'other.event' })).expect(200);

    expect(res.body).toEqual({ received: true, outcome: 'IGNORED_EVENT_TYPE' });
    expect(handle.execute).not.toHaveBeenCalled();
  });

  it('401 for a forged signature', async () => {
    await post(signedEvent({ secret: 'attacker' })).expect(401);
    expect(handle.execute).not.toHaveBeenCalled();
  });

  it('422 for a malformed event', async () => {
    await post({ hello: 'world' }).expect(422);
  });

  it('500 when the event cannot be processed (the gateway will retry)', async () => {
    handle.execute.mockResolvedValue(err(unexpected(new Error('db'))));

    await post(signedEvent()).expect(500);
  });
});
