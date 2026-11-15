import { createHash } from 'crypto';

export const EVENTS_SECRET = 'events_secret_test';

interface EventOptions {
  event?: string;
  status?: string;
  amountInCents?: number;
  reference?: string;
  statusMessage?: string | null;
  timestamp?: number;
  secret?: string;
}

/** Builds an event signed exactly like the gateway does. */
export const signedEvent = ({
  event = 'transaction.updated',
  status = 'APPROVED',
  amountInCents = 2_300_000,
  reference = 'ref-1',
  statusMessage = null,
  timestamp = 1_794_621_905,
  secret = EVENTS_SECRET,
}: EventOptions = {}) => {
  const transaction = {
    id: 'gw-tx-1',
    reference,
    status,
    amount_in_cents: amountInCents,
    status_message: statusMessage,
  };
  const properties = [
    'transaction.id',
    'transaction.status',
    'transaction.amount_in_cents',
  ];
  const checksum = createHash('sha256')
    .update(
      `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${secret}`,
    )
    .digest('hex');

  return {
    event,
    data: { transaction },
    environment: 'test',
    signature: { properties, checksum },
    timestamp,
    sent_at: '2026-11-15T00:00:00.000Z',
  };
};
