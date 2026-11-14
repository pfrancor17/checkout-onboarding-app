import { ConfigService } from '@nestjs/config';
import { CheckoutFees } from '../domain/transaction';

export const checkoutFeesFactory = (config: ConfigService): CheckoutFees => ({
  baseFeeInCents: Number(config.get('BASE_FEE_IN_CENTS', 300000)),
  deliveryFeeInCents: Number(config.get('DELIVERY_FEE_IN_CENTS', 1000000)),
});
