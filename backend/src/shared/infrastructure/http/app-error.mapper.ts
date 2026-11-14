import {
  BadGatewayException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AppError } from '../../domain/app-error';

const logger = new Logger('AppErrorMapper');

/** Turns any cause into readable text for the logs. */
export const describeCause = (cause: unknown): string => {
  if (cause instanceof Error) return cause.message;
  if (cause === undefined) return 'no details';
  try {
    return JSON.stringify(cause);
  } catch {
    return '[unserializable cause]';
  }
};

/** Translates a business error into the matching HTTP exception. */
export const toHttpException = (error: AppError): HttpException => {
  switch (error.code) {
    case 'NOT_FOUND':
      return new NotFoundException(error.message);
    case 'VALIDATION':
      return new UnprocessableEntityException(error.message);
    case 'CONFLICT':
      return new ConflictException(error.message);
    case 'PAYMENT_GATEWAY':
      logger.warn(`${error.message}: ${describeCause(error.cause)}`);
      return new BadGatewayException(error.message);
    case 'GATEWAY_UNAVAILABLE':
      logger.warn(`${error.message}: ${describeCause(error.cause)}`);
      return new ServiceUnavailableException(error.message);
    case 'UNEXPECTED':
      // The cause is logged but never sent to the client.
      logger.error(error.message, error.cause);
      return new InternalServerErrorException(error.message);
  }
};
