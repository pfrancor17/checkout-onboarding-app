import {
  BadGatewayException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AppError } from '../../domain/app-error';

const logger = new Logger('AppErrorMapper');

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
      logger.warn(`${error.message}: ${String(error.cause)}`);
      return new BadGatewayException(error.message);
    case 'UNEXPECTED':
      // The cause is logged but never sent to the client.
      logger.error(error.message, error.cause);
      return new InternalServerErrorException(error.message);
  }
};
