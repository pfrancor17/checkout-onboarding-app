import { UnauthorizedException } from '@nestjs/common';
import {
  EVENTS_SECRET,
  signedEvent,
} from '../../../payments/infrastructure/payment-event.fixture';
import { notFound } from '../../../shared/domain/app-error';
import { err, ok } from '../../../shared/domain/result';
import { HandlePaymentEventUseCase } from '../../application/handle-payment-event.use-case';
import { PaymentEventsController } from './payment-events.controller';

describe('PaymentEventsController', () => {
  const handle = { execute: jest.fn() };
  const controller = new PaymentEventsController(
    EVENTS_SECRET,
    handle as unknown as HandlePaymentEventUseCase,
  );

  beforeEach(() => handle.execute.mockReset());

  it('hands a verified event to the use case', async () => {
    handle.execute.mockResolvedValue(ok('STILL_PENDING'));

    await expect(controller.receive(signedEvent())).resolves.toEqual({
      received: true,
      outcome: 'STILL_PENDING',
    });
  });

  it('acknowledges a verified event of another type without processing it', async () => {
    await expect(
      controller.receive(signedEvent({ event: 'other.event' })),
    ).resolves.toEqual({ received: true, outcome: 'IGNORED_EVENT_TYPE' });
    expect(handle.execute).not.toHaveBeenCalled();
  });

  it('rejects a forged event before touching the use case', async () => {
    await expect(
      controller.receive(signedEvent({ secret: 'x' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(handle.execute).not.toHaveBeenCalled();
  });

  it('maps use case errors to HTTP', async () => {
    handle.execute.mockResolvedValue(err(notFound('x')));

    await expect(controller.receive(signedEvent())).rejects.toMatchObject({
      status: 404,
    });
  });
});
