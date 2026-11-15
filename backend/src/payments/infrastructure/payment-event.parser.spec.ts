import { EVENTS_SECRET, signedEvent } from './payment-event.fixture';
import { parsePaymentEvent } from './payment-event.parser';

describe('parsePaymentEvent', () => {
  it('accepts a correctly signed transaction update', () => {
    const result = parsePaymentEvent(
      signedEvent({ status: 'DECLINED', statusMessage: 'Rechazada' }),
      EVENTS_SECRET,
    );

    expect(result.isOk && result.value).toEqual({
      gatewayTransactionId: 'gw-tx-1',
      reference: 'ref-1',
      status: 'DECLINED',
      amountInCents: 2_300_000,
      statusMessage: 'Rechazada',
    });
  });

  it('accepts an uppercase checksum and a string timestamp', () => {
    const event = signedEvent();
    const result = parsePaymentEvent(
      {
        ...event,
        timestamp: String(event.timestamp),
        signature: {
          ...event.signature,
          checksum: event.signature.checksum.toUpperCase(),
        },
      },
      EVENTS_SECRET,
    );

    expect(result.isOk).toBe(true);
  });

  it('maps an unknown status to PENDING (never to a failure)', () => {
    const result = parsePaymentEvent(
      signedEvent({ status: 'SOMETHING_NEW' }),
      EVENTS_SECRET,
    );

    expect(result.isOk && result.value?.status).toBe('PENDING');
  });

  describe('signature', () => {
    it('rejects an event signed with another secret', () => {
      const result = parsePaymentEvent(
        signedEvent({ secret: 'attacker' }),
        EVENTS_SECRET,
      );

      expect(result.isErr && result.error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Invalid event signature',
      });
    });

    it('rejects an event whose data was tampered with after signing', () => {
      const event = signedEvent({ status: 'DECLINED' });
      event.data.transaction.status = 'APPROVED';

      const result = parsePaymentEvent(event, EVENTS_SECRET);

      expect(result.isErr && result.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects a checksum of a different length', () => {
      const event = signedEvent();
      event.signature.checksum = 'abc';

      const result = parsePaymentEvent(event, EVENTS_SECRET);

      expect(result.isErr && result.error.code).toBe('UNAUTHORIZED');
    });
  });

  it('ignores (Ok null) a verified event of another type', () => {
    const result = parsePaymentEvent(
      signedEvent({ event: 'nequi_token.updated' }),
      EVENTS_SECRET,
    );

    expect(result.isOk && result.value).toBeNull();
  });

  describe('malformed payloads', () => {
    const valid = signedEvent();

    it.each<[string, unknown]>([
      ['not an object', 'hello'],
      ['an array', []],
      ['without data', { ...valid, data: undefined }],
      ['without signature', { ...valid, signature: undefined }],
      ['without timestamp', { ...valid, timestamp: undefined }],
      [
        'with empty properties',
        { ...valid, signature: { ...valid.signature, properties: [] } },
      ],
      [
        'with non-string properties',
        { ...valid, signature: { ...valid.signature, properties: [1] } },
      ],
      [
        'without checksum',
        { ...valid, signature: { properties: valid.signature.properties } },
      ],
      [
        'with a signed path through a non-object',
        { ...valid, data: { transaction: 'not-an-object' } },
      ],
      [
        'with a missing signed property',
        { ...valid, data: { transaction: { id: 'gw-tx-1' } } },
      ],
    ])('rejects a payload %s', (_case, body) => {
      const result = parsePaymentEvent(body, EVENTS_SECRET);

      expect(result.isErr && result.error.code).toBe('VALIDATION');
    });

    it('rejects a signed transaction update without a reference', () => {
      const event = signedEvent() as Record<string, unknown> & {
        data: { transaction: Record<string, unknown> };
      };
      delete event.data.transaction.reference;

      const result = parsePaymentEvent(event, EVENTS_SECRET);

      expect(result.isErr && result.error).toMatchObject({
        code: 'VALIDATION',
        message: 'Invalid transaction in event',
      });
    });
  });
});
