import { ConfigService } from '@nestjs/config';
import { checkoutFeesFactory } from './checkout-fees.config';

describe('checkoutFeesFactory', () => {
  it('reads the fees from the config', () => {
    const config = new ConfigService({
      BASE_FEE_IN_CENTS: 500,
      DELIVERY_FEE_IN_CENTS: 700,
    });
    expect(checkoutFeesFactory(config)).toEqual({
      baseFeeInCents: 500,
      deliveryFeeInCents: 700,
    });
  });

  it('uses defaults', () => {
    expect(checkoutFeesFactory(new ConfigService({}))).toEqual({
      baseFeeInCents: 300000,
      deliveryFeeInCents: 1000000,
    });
  });
});
