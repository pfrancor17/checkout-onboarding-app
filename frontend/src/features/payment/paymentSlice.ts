import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { checkoutFinished, paymentRetried } from '../checkout/checkoutSlice';

/**
 * Session-only payment data. This slice is NOT persisted: the card token
 * lives in memory only. After a refresh the customer re-enters the card
 * (their delivery data is kept), which is the safe trade-off.
 */
export interface PaymentState {
  cardToken: string | null;
}

export const initialPaymentState: PaymentState = { cardToken: null };

const paymentSlice = createSlice({
  name: 'payment',
  initialState: initialPaymentState,
  reducers: {
    cardTokenized(state, action: PayloadAction<string>) {
      state.cardToken = action.payload;
    },
    cardTokenCleared(state) {
      state.cardToken = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkoutFinished, () => initialPaymentState)
      .addCase(paymentRetried, () => initialPaymentState);
  },
});

export const { cardTokenized, cardTokenCleared } = paymentSlice.actions;
export const paymentReducer = paymentSlice.reducer;
