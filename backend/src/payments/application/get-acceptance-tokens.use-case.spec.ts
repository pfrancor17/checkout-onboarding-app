import { ok } from '../../shared/domain/result';
import { PaymentGateway } from '../domain/payment-gateway.port';
import { GetAcceptanceTokensUseCase } from './get-acceptance-tokens.use-case';

describe('GetAcceptanceTokensUseCase', () => {
  it('delegates to the payment gateway', async () => {
    const tokens = {
      acceptanceToken: 'a',
      termsUrl: 'b',
      personalDataAuthToken: 'c',
      personalDataPolicyUrl: 'd',
    };
    const gateway = {
      getAcceptanceTokens: jest.fn().mockResolvedValue(ok(tokens)),
    } as unknown as PaymentGateway;

    const result = await new GetAcceptanceTokensUseCase(gateway).execute();

    expect(result.isOk && result.value).toEqual(tokens);
  });
});
