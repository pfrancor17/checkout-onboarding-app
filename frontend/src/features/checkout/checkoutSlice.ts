import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CardBrand } from '../payment/cardValidation';
import type { CustomerForm, DeliveryForm } from '../payment/deliveryValidation';

/**
 * The 5-step business process:
 * 1. PRODUCT → 2. PAYMENT_FORM → 3. SUMMARY → 4. RESULT → 5. PRODUCT
 */
export type CheckoutStep = 'PRODUCT' | 'PAYMENT_FORM' | 'SUMMARY' | 'RESULT';

/** Only what is safe to keep about the card: brand and last 4 digits. */
export interface CardSummary {
  brand: CardBrand;
  lastFour: string;
}

export interface CheckoutState {
  step: CheckoutStep;
  productId: string | null;
  quantity: number;
  /** Kept while typing, so a refresh does not lose the delivery data. */
  customer: CustomerForm;
  delivery: DeliveryForm;
  card: CardSummary | null;
  installments: number;
  /** Set once the backend created the transaction; used to recover it. */
  transactionId: string | null;
}

export const initialCheckoutState: CheckoutState = {
  step: 'PRODUCT',
  productId: null,
  quantity: 1,
  customer: { fullName: '', email: '', phone: '' },
  delivery: {
    addressLine1: '',
    addressLine2: '',
    city: '',
    region: '',
    postalCode: '',
  },
  card: null,
  installments: 1,
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
    customerFieldChanged(
      state,
      action: PayloadAction<{ field: keyof CustomerForm; value: string }>,
    ) {
      state.customer[action.payload.field] = action.payload.value;
    },
    deliveryFieldChanged(
      state,
      action: PayloadAction<{ field: keyof DeliveryForm; value: string }>,
    ) {
      state.delivery[action.payload.field] = action.payload.value;
    },
    paymentFormClosed(state) {
      if (state.step !== 'PAYMENT_FORM') return;
      state.step = 'PRODUCT';
    },
    paymentInfoSubmitted(
      state,
      action: PayloadAction<{ card: CardSummary; installments: number }>,
    ) {
      if (state.step !== 'PAYMENT_FORM') return;
      state.step = 'SUMMARY';
      state.card = action.payload.card;
      state.installments = action.payload.installments;
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
    /** Back to the product page; personal data is wiped from the device. */
    checkoutFinished() {
      return initialCheckoutState;
    },
  },
});

export const {
  checkoutStarted,
  customerFieldChanged,
  deliveryFieldChanged,
  paymentFormClosed,
  paymentInfoSubmitted,
  summaryDismissed,
  transactionCreated,
  checkoutFinished,
} = checkoutSlice.actions;

export const checkoutReducer = checkoutSlice.reducer;
