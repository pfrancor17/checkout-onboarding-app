import { Logger } from '@nestjs/common';
import {
  AppError,
  conflict,
  notFound,
  paymentGatewayError,
  unexpected,
  validationError,
} from '../../domain/app-error';
import { toHttpException } from './app-error.mapper';

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
    [paymentGatewayError('gateway down', new Error('timeout')), 502],
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
});
