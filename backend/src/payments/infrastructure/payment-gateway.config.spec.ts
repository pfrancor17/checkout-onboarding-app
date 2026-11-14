import { ConfigService } from '@nestjs/config';
import {
  paymentGatewayConfigFactory,
  paymentPollingConfigFactory,
} from './payment-gateway.config';

describe('payment gateway config', () => {
  const configFrom = (values: Record<string, unknown>) =>
    new ConfigService(values);

  it('builds the gateway config and trims the trailing slash of the URL', () => {
    const config = paymentGatewayConfigFactory(
      configFrom({
        PAYMENT_API_URL: 'https://gateway.test/v1/',
        PAYMENT_PUBLIC_KEY: 'pub',
        PAYMENT_PRIVATE_KEY: 'prv',
        PAYMENT_INTEGRITY_SECRET: 'int',
        PAYMENT_TIMEOUT_MS: 3000,
      }),
    );

    expect(config).toEqual({
      apiUrl: 'https://gateway.test/v1',
      publicKey: 'pub',
      privateKey: 'prv',
      integritySecret: 'int',
      timeoutMs: 3000,
    });
  });

  it('fails fast when a key is missing', () => {
    expect(() => paymentGatewayConfigFactory(configFrom({}))).toThrow();
  });

  it('uses polling defaults', () => {
    expect(paymentPollingConfigFactory(configFrom({}))).toEqual({
      attempts: 10,
      intervalMs: 2000,
      maxWaitMs: 15000,
    });
  });
});
