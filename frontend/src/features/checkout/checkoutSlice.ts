import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * The 5-step business process:
 * 1. PRODUCT → 2. PAYMENT_FORM → 3. SUMMARY → 4. RESULT → 5. PRODUCT
 */
export type CheckoutStep = 'PRODUCT' | 'PAYMENT_FORM' | 'SUMMARY' | 'RESULT';

export interface CheckoutState {
  step: CheckoutStep;
  productId: string | null;
  quantity: number;
  /** Set once the backend created the transaction; used to recover it. */
  transactionId: string | null;
}

export const initialCheckoutState: CheckoutState = {
  step: 'PRODUCT',
  productId: null,
  quantity: 1,
  transactionId: null,
};

/**
 * Flux: every action describes something that happened. The reducer only
 * moves forward along the allowed transitions, so a stale or repeated
 * action (e.g. a double click) cannot leave the flow in an invalid step.
 */
const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: initialCheckoutState,
  reducers: {
    checkoutStarted(
      state,
      action: PayloadAction<{ productId: string; quantity: number }>,
    ) {
      if (state.step !== 'PRODUCT') return;
      state.step = 'PAYMENT_FORM';
      state.productId = action.payload.productId;
      state.quantity = action.payload.quantity;
    },
    paymentFormClosed(state) {
      if (state.step !== 'PAYMENT_FORM') return;
      state.step = 'PRODUCT';
    },
    paymentInfoSubmitted(state) {
      if (state.step !== 'PAYMENT_FORM') return;
      state.step = 'SUMMARY';
    },
    summaryDismissed(state) {
      if (state.step !== 'SUMMARY') return;
      state.step = 'PAYMENT_FORM';
    },
    transactionCreated(state, action: PayloadAction<string>) {
      if (state.step !== 'SUMMARY') return;
      state.step = 'RESULT';
      state.transactionId = action.payload;
    },
    checkoutFinished() {
      return initialCheckoutState;
    },
  },
});

export const {
  checkoutStarted,
  paymentFormClosed,
  paymentInfoSubmitted,
  summaryDismissed,
  transactionCreated,
  checkoutFinished,
} = checkoutSlice.actions;

export const checkoutReducer = checkoutSlice.reducer;
