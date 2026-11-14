import { calculateAmounts, resolvePayment } from './transaction';

describe('calculateAmounts', () => {
  it('adds the base fee and the delivery fee to the product amount', () => {
    expect(
      calculateAmounts(24_990_000, 2, 'COP', {
        baseFeeInCents: 300_000,
        deliveryFeeInCents: 1_000_000,
      }),
    ).toEqual({
      unitPriceInCents: 24_990_000,
      quantity: 2,
      productAmountInCents: 49_980_000,
      baseFeeInCents: 300_000,
      deliveryFeeInCents: 1_000_000,
      totalAmountInCents: 51_280_000,
      currency: 'COP',
    });
  });

  it('always charges the base fee, even with free delivery', () => {
    const amounts = calculateAmounts(1_000, 1, 'COP', {
      baseFeeInCents: 500,
      deliveryFeeInCents: 0,
    });
    expect(amounts.totalAmountInCents).toBe(1_500);
  });
});

describe('resolvePayment', () => {
  it('returns null while the payment is PENDING', () => {
    expect(resolvePayment('PENDING', null)).toBeNull();
  });

  it('keeps the stock sold and assigns the delivery when APPROVED', () => {
    expect(resolvePayment('APPROVED', null)).toEqual({
      status: 'APPROVED',
      statusMessage: null,
      deliveryStatus: 'ASSIGNED',
      releaseStock: false,
    });
  });

  it.each(['DECLINED', 'VOIDED', 'ERROR'] as const)(
    'releases the stock and cancels the delivery when %s',
    (status) => {
      expect(resolvePayment(status, 'msg')).toEqual({
        status,
        statusMessage: 'msg',
        deliveryStatus: 'CANCELLED',
        releaseStock: true,
      });
    },
  );
});
