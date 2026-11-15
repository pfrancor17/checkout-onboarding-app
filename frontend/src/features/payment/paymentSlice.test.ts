import { checkoutFinished } from '../checkout/checkoutSlice';
import {
  cardTokenCleared,
  cardTokenized,
  initialPaymentState,
  paymentReducer,
} from './paymentSlice';

describe('paymentSlice', () => {
  it('keeps the card token in memory', () => {
    const state = paymentReducer(undefined, cardTokenized('tok_1'));
    expect(state.cardToken).toBe('tok_1');
  });

  it('clears the token on demand and when the checkout finishes', () => {
    const withToken = paymentReducer(undefined, cardTokenized('tok_1'));

    expect(paymentReducer(withToken, cardTokenCleared())).toEqual(
      initialPaymentState,
    );
    expect(paymentReducer(withToken, checkoutFinished())).toEqual(
      initialPaymentState,
    );
  });
});
