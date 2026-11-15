import {
  checkoutFinished,
  checkoutReducer,
  checkoutStarted,
  type CheckoutState,
  customerFieldChanged,
  deliveryFieldChanged,
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

    state = checkoutReducer(
      state,
      paymentInfoSubmitted({
        card: { brand: 'VISA', lastFour: '4242' },
        installments: 3,
      }),
    );
    expect(state).toMatchObject({
      step: 'SUMMARY',
      card: { brand: 'VISA', lastFour: '4242' },
      installments: 3,
    });

    state = checkoutReducer(state, transactionCreated('tx-1'));
    expect(state).toMatchObject({ step: 'RESULT', transactionId: 'tx-1' });

    state = checkoutReducer(state, checkoutFinished());
    expect(state).toEqual(initialCheckoutState);
  });

  it('stores the delivery data field by field', () => {
    let state = checkoutReducer(
      at('PAYMENT_FORM'),
      customerFieldChanged({ field: 'email', value: 'jane@example.com' }),
    );
    state = checkoutReducer(
      state,
      deliveryFieldChanged({ field: 'city', value: 'Medellín' }),
    );

    expect(state.customer.email).toBe('jane@example.com');
    expect(state.delivery.city).toBe('Medellín');
  });

  it('wipes the personal data when the checkout finishes', () => {
    const state = checkoutReducer(
      at('RESULT'),
      customerFieldChanged({ field: 'phone', value: '3001234567' }),
    );

    expect(checkoutReducer(state, checkoutFinished()).customer.phone).toBe('');
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
      [
        'paymentInfoSubmitted',
        at('PRODUCT'),
        paymentInfoSubmitted({
          card: { brand: 'VISA', lastFour: '4242' },
          installments: 1,
        }),
      ],
      ['summaryDismissed', at('RESULT'), summaryDismissed()],
      // e.g. a double click on "Pay": the second response is ignored
      ['transactionCreated', at('RESULT'), transactionCreated('tx-2')],
    ])('%s', (_name, state, action) => {
      expect(checkoutReducer(state, action)).toEqual(state);
    });
  });
});
