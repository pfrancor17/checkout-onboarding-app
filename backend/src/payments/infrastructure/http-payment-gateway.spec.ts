import { CardPaymentRequest } from '../domain/payment-gateway.port';
import { HttpPaymentGateway } from './http-payment-gateway';
import { buildIntegritySignature } from './integrity-signature';
import { PaymentGatewayConfig } from './payment-gateway.config';

const config: PaymentGatewayConfig = {
  apiUrl: 'https://gateway.test/v1',
  publicKey: 'pub_test_123',
  privateKey: 'prv_test_456',
  integritySecret: 'integrity_789',
  timeoutMs: 5000,
};

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as Response;

const transactionData = {
  id: 'gw-tx-1',
  reference: 'ref-1',
  status: 'PENDING',
  amount_in_cents: 2_549_000,
  status_message: null,
};

describe('HttpPaymentGateway', () => {
  const gateway = new HttpPaymentGateway(config);
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => fetchMock.mockRestore());

  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    return { url, init, headers: init.headers as Record<string, string> };
  };

  describe('getAcceptanceTokens', () => {
    it('reads both acceptances from the merchant endpoint', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          data: {
            presigned_acceptance: {
              acceptance_token: 'acc-token',
              permalink: 'https://terms.pdf',
            },
            presigned_personal_data_auth: {
              acceptance_token: 'personal-token',
              permalink: 'https://personal.pdf',
            },
          },
        }),
      );

      const result = await gateway.getAcceptanceTokens();

      expect(lastCall().url).toBe(
        'https://gateway.test/v1/merchants/pub_test_123',
      );
      expect(result.isOk && result.value).toEqual({
        acceptanceToken: 'acc-token',
        termsUrl: 'https://terms.pdf',
        personalDataAuthToken: 'personal-token',
        personalDataPolicyUrl: 'https://personal.pdf',
      });
    });
  });

  describe('createCardPayment', () => {
    const request: CardPaymentRequest = {
      reference: 'ref-1',
      amountInCents: 2_549_000,
      currency: 'COP',
      customerEmail: 'jane@example.com',
      cardToken: 'tok_test_1',
      installments: 1,
      acceptanceToken: 'acc-token',
      personalDataAuthToken: 'personal-token',
    };

    it('sends a signed card payment with the private key', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, { data: transactionData }));

      const result = await gateway.createCardPayment(request);

      const { url, init, headers } = lastCall();
      expect(url).toBe('https://gateway.test/v1/transactions');
      expect(init.method).toBe('POST');
      expect(headers.Authorization).toBe('Bearer prv_test_456');
      expect(JSON.parse(init.body as string)).toEqual({
        acceptance_token: 'acc-token',
        accept_personal_auth: 'personal-token',
        amount_in_cents: 2_549_000,
        currency: 'COP',
        customer_email: 'jane@example.com',
        reference: 'ref-1',
        signature: buildIntegritySignature(
          'ref-1',
          2_549_000,
          'COP',
          'integrity_789',
        ),
        payment_method: { type: 'CARD', token: 'tok_test_1', installments: 1 },
      });
      expect(result.isOk && result.value).toEqual({
        id: 'gw-tx-1',
        reference: 'ref-1',
        status: 'PENDING',
        amountInCents: 2_549_000,
        statusMessage: null,
      });
    });

    it('returns PAYMENT_GATEWAY when the gateway rejects the request', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(422, { error: { type: 'INPUT_VALIDATION_ERROR' } }),
      );

      const result = await gateway.createCardPayment(request);

      expect(result.isErr && result.error).toMatchObject({
        code: 'PAYMENT_GATEWAY',
        message: 'Payment gateway rejected the request (HTTP 422)',
        cause: { type: 'INPUT_VALIDATION_ERROR' },
      });
    });
  });

  describe('getTransaction', () => {
    it('maps the transaction status', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          data: {
            ...transactionData,
            status: 'DECLINED',
            status_message: 'Insufficient funds',
          },
        }),
      );

      const result = await gateway.getTransaction('gw-tx-1');

      expect(lastCall().url).toBe(
        'https://gateway.test/v1/transactions/gw-tx-1',
      );
      expect(result.isOk && result.value).toMatchObject({
        status: 'DECLINED',
        statusMessage: 'Insufficient funds',
      });
    });

    it('treats an unknown status as ERROR', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          data: {
            id: 'gw-tx-1',
            reference: 'ref-1',
            status: 'SOMETHING_NEW',
            amount_in_cents: 1,
          },
        }),
      );

      const result = await gateway.getTransaction('gw-tx-1');

      expect(result.isOk && result.value).toMatchObject({
        status: 'ERROR',
        statusMessage: null,
      });
    });

    it('returns PAYMENT_GATEWAY when the network fails', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNRESET'));

      const result = await gateway.getTransaction('gw-tx-1');

      expect(result.isErr && result.error).toMatchObject({
        code: 'PAYMENT_GATEWAY',
        message: 'Payment gateway is unreachable',
      });
    });

    it('returns PAYMENT_GATEWAY when the body is not JSON', async () => {
      const htmlResponse = {
        ok: false,
        status: 503,
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      };
      fetchMock.mockResolvedValue(htmlResponse);

      const result = await gateway.getTransaction('gw-tx-1');

      expect(result.isErr && result.error.message).toContain('HTTP 503');
    });
  });
});
