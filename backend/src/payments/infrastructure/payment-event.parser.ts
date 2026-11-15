import { createHash, timingSafeEqual } from 'crypto';
import {
  AppError,
  unauthorized,
  validationError,
} from '../../shared/domain/app-error';
import { err, ok, Result } from '../../shared/domain/result';
import { PaymentEvent } from '../domain/payment-event';
import { toPaymentStatus } from './payment-status.mapper';

/** The only event the checkout cares about. */
export const TRANSACTION_UPDATED = 'transaction.updated';

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads a dotted path such as "transaction.id" inside the event data. */
const valueAt = (data: JsonObject, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (current, key) => (isObject(current) ? current[key] : undefined),
      data,
    );

const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');

/** Constant-time comparison: does not leak how much of the checksum matched. */
const sameChecksum = (expected: string, received: string) => {
  const a = Buffer.from(expected);
  const b = Buffer.from(received.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Verifies and parses a webhook event from the payment gateway.
 *
 * The gateway signs each event: SHA-256 of the values of the listed
 * properties (in order) + the timestamp + the events secret. Nothing in
 * the event is trusted before the signature checks out.
 *
 * - Ok(PaymentEvent): a verified transaction update.
 * - Ok(null): a verified event of another type (nothing to do).
 * - Err(UNAUTHORIZED): bad signature. Err(VALIDATION): malformed payload.
 */
export const parsePaymentEvent = (
  body: unknown,
  eventsSecret: string,
): Result<PaymentEvent | null, AppError> => {
  if (!isObject(body) || !isObject(body.data) || !isObject(body.signature)) {
    return err(validationError('Invalid event payload'));
  }
  const { data, signature, timestamp } = body;
  const properties = signature.properties;
  const checksum = signature.checksum;
  if (
    !Array.isArray(properties) ||
    properties.length === 0 ||
    !properties.every((p) => typeof p === 'string') ||
    typeof checksum !== 'string' ||
    (typeof timestamp !== 'number' && typeof timestamp !== 'string')
  ) {
    return err(validationError('Invalid event signature format'));
  }

  const values = properties.map((path) => valueAt(data, path));
  if (values.some((value) => value === undefined || value === null)) {
    return err(validationError('A signed property is missing'));
  }

  const expected = sha256(
    `${values.map(String).join('')}${String(timestamp)}${eventsSecret}`,
  );
  if (!sameChecksum(expected, checksum)) {
    return err(unauthorized('Invalid event signature'));
  }

  if (body.event !== TRANSACTION_UPDATED) return ok(null);

  const transaction = data.transaction;
  if (
    !isObject(transaction) ||
    typeof transaction.id !== 'string' ||
    typeof transaction.reference !== 'string' ||
    typeof transaction.status !== 'string' ||
    typeof transaction.amount_in_cents !== 'number'
  ) {
    return err(validationError('Invalid transaction in event'));
  }

  return ok({
    gatewayTransactionId: transaction.id,
    reference: transaction.reference,
    status: toPaymentStatus(transaction.status),
    amountInCents: transaction.amount_in_cents,
    statusMessage:
      typeof transaction.status_message === 'string'
        ? transaction.status_message
        : null,
  });
};
