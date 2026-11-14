import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../shared/domain/app-error';
import { Result } from '../../shared/domain/result';
import {
  AcceptanceTokens,
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from '../domain/payment-gateway.port';

/**
 * Returns the legal acceptances (terms and personal data policy) the
 * customer must accept on the summary screen before paying.
 */
@Injectable()
export class GetAcceptanceTokensUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  execute(): Promise<Result<AcceptanceTokens, AppError>> {
    return this.gateway.getAcceptanceTokens();
  }
}
