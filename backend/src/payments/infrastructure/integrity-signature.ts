import { createHash } from 'crypto';

/**
 * Integrity signature required by the gateway to make sure the amount
 * was not tampered with: SHA-256 of reference + amount + currency + secret.
 * It is computed on the backend so the secret never reaches the browser.
 */
export const buildIntegritySignature = (
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string,
): string =>
  createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${integritySecret}`)
    .digest('hex');
