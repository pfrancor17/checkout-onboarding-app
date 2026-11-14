import { BadGatewayException, Logger } from '@nestjs/common';
import { paymentGatewayError } from '../../../shared/domain/app-error';
import { err, ok } from '../../../shared/domain/result';
import { GetAcceptanceTokensUseCase } from '../../application/get-acceptance-tokens.use-case';
import { PaymentsController } from './payments.controller';

describe('PaymentsController', () => {
  const useCase = { execute: jest.fn() };
  const controller = new PaymentsController(
    useCase as unknown as GetAcceptanceTokensUseCase,
  );

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterAll(() => jest.restoreAllMocks());

  it('returns the acceptance tokens', async () => {
    const tokens = {
      acceptanceToken: 'acc',
      termsUrl: 'https://terms.pdf',
      personalDataAuthToken: 'personal',
      personalDataPolicyUrl: 'https://personal.pdf',
    };
    useCase.execute.mockResolvedValue(ok(tokens));

    await expect(controller.acceptanceTokens()).resolves.toEqual(tokens);
  });

  it('maps a gateway failure to 502', async () => {
    useCase.execute.mockResolvedValue(err(paymentGatewayError('down')));

    await expect(controller.acceptanceTokens()).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
