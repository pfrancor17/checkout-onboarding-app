import { Logger } from '@nestjs/common';
import {
  AppError,
  conflict,
  gatewayUnavailable,
  notFound,
  paymentGatewayError,
  unexpected,
  validationError,
} from '../../domain/app-error';
import { describeCause, toHttpException } from './app-error.mapper';

describe('toHttpException', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterAll(() => jest.restoreAllMocks());

  it.each<[AppError, number]>([
    [notFound('missing'), 404],
    [validationError('bad input'), 422],
    [conflict('out of stock'), 409],
    [paymentGatewayError('gateway rejected', new Error('422')), 502],
    [gatewayUnavailable('gateway timeout', new Error('timeout')), 503],
    [unexpected(new Error('db')), 500],
  ])('maps %o to HTTP %i', (error, status) => {
    const exception = toHttpException(error);

    expect(exception.getStatus()).toBe(status);
    expect(exception.message).toBe(error.message);
  });

  it('never leaks the internal cause to the client', () => {
    const exception = toHttpException(unexpected(new Error('password=123')));

    expect(JSON.stringify(exception.getResponse())).not.toContain('password');
  });

  it('logs the gateway error body as readable JSON', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn');

    toHttpException(
      paymentGatewayError('Gateway rejected (HTTP 422)', {
        type: 'INPUT_VALIDATION_ERROR',
      }),
    );

    expect(warn).toHaveBeenLastCalledWith(
      'Gateway rejected (HTTP 422): {"type":"INPUT_VALIDATION_ERROR"}',
    );
  });

  describe('describeCause', () => {
    it('uses the message of an Error', () => {
      expect(describeCause(new Error('ECONNRESET'))).toBe('ECONNRESET');
    });

    it('says when there are no details', () => {
      expect(describeCause(undefined)).toBe('no details');
    });

    it('does not break on values JSON cannot serialize', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(describeCause(circular)).toBe('[unserializable cause]');
    });
  });
});
