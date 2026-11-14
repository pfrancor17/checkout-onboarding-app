import {
  checkoutFinished,
  checkoutReducer,
  checkoutStarted,
  type CheckoutState,
  initialCheckoutState,
  paymentFormClosed,
  paymentInfoSubmitted,
  summaryDismissed,
  transactionCreated,
} from './checkoutSlice';

const at = (step: CheckoutState['step']): CheckoutState => ({
  ...initialCheckoutState,
  step,
  productId: step === 'PRODUCT' ? null : 'prod-1',
});

describe('checkoutSlice', () => {
  it('starts on the product page', () => {
    expect(checkoutReducer(undefined, { type: 'init' })).toEqual(
      initialCheckoutState,
    );
  });

  it('walks the happy path: product → form → summary → result → product', () => {
    let state = checkoutReducer(
      undefined,
      checkoutStarted({ productId: 'prod-1', quantity: 2 }),
    );
    expect(state).toMatchObject({
      step: 'PAYMENT_FORM',
      productId: 'prod-1',
      quantity: 2,
    });

    state = checkoutReducer(state, paymentInfoSubmitted());
    expect(state.step).toBe('SUMMARY');

    state = checkoutReducer(state, transactionCreated('tx-1'));
    expect(state).toMatchObject({ step: 'RESULT', transactionId: 'tx-1' });

    state = checkoutReducer(state, checkoutFinished());
    expect(state).toEqual(initialCheckoutState);
  });

  it('can go back from the form and from the summary', () => {
    expect(checkoutReducer(at('PAYMENT_FORM'), paymentFormClosed()).step).toBe(
      'PRODUCT',
    );
    expect(checkoutReducer(at('SUMMARY'), summaryDismissed()).step).toBe(
      'PAYMENT_FORM',
    );
  });

  describe('ignores actions that do not apply to the current step', () => {
    it.each([
      [
        'checkoutStarted',
        at('SUMMARY'),
        checkoutStarted({ productId: 'x', quantity: 1 }),
      ],
      ['paymentFormClosed', at('SUMMARY'), paymentFormClosed()],
      ['paymentInfoSubmitted', at('PRODUCT'), paymentInfoSubmitted()],
      ['summaryDismissed', at('RESULT'), summaryDismissed()],
      // e.g. a double click on "Pay": the second response is ignored
      ['transactionCreated', at('RESULT'), transactionCreated('tx-2')],
    ])('%s', (_name, state, action) => {
      expect(checkoutReducer(state, action)).toEqual(state);
    });
  });
});
