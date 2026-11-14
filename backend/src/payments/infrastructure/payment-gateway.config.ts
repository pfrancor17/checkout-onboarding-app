import { ConfigService } from '@nestjs/config';
import { PaymentPollingConfig } from '../application/payment-status-poller';

export interface PaymentGatewayConfig {
  apiUrl: string;
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  timeoutMs: number;
}

export const PAYMENT_GATEWAY_CONFIG = Symbol('PAYMENT_GATEWAY_CONFIG');

export const paymentGatewayConfigFactory = (
  config: ConfigService,
): PaymentGatewayConfig => ({
  apiUrl: config.getOrThrow<string>('PAYMENT_API_URL').replace(/\/+$/, ''),
  publicKey: config.getOrThrow<string>('PAYMENT_PUBLIC_KEY'),
  privateKey: config.getOrThrow<string>('PAYMENT_PRIVATE_KEY'),
  integritySecret: config.getOrThrow<string>('PAYMENT_INTEGRITY_SECRET'),
  timeoutMs: Number(config.get('PAYMENT_TIMEOUT_MS', 10000)),
});

export const paymentPollingConfigFactory = (
  config: ConfigService,
): PaymentPollingConfig => ({
  attempts: Number(config.get('PAYMENT_POLL_ATTEMPTS', 10)),
  intervalMs: Number(config.get('PAYMENT_POLL_INTERVAL_MS', 2000)),
});
