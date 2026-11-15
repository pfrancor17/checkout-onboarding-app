import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { ApiError, apiRequest } from '../../shared/api/httpClient';
import {
  checkoutFinished,
  paymentAttemptStarted,
  paymentRetried,
  transactionCreated,
} from '../checkout/checkoutSlice';
import type { RequestStatus } from '../products/productsSlice';
import type { Transaction } from './types';

export interface TransactionState {
  current: Transaction | null;
  status: RequestStatus;
  error: string | null;
  /** HTTP status of the last failure (409 = no stock, 0 = network). */
  errorStatus: number | null;
}

export const initialTransactionState: TransactionState = {
  current: null,
  status: 'idle',
  error: null,
  errorStatus: null,
};

export const PAY_ERROR_MESSAGE =
  'No pudimos procesar el pago. Inténtalo de nuevo.';

const newIdempotencyKey = () => crypto.randomUUID();

/**
 * Step "Pay": creates the transaction in the backend, which charges the
 * card through the gateway and returns the result.
 *
 * The Idempotency-Key is created once per payment attempt and persisted:
 * retrying after a network error or a refresh returns the same
 * transaction instead of charging twice.
 */
export const payTransaction = createAsyncThunk<
  Transaction,
  void,
  { state: RootState; rejectValue: { message: string; status: number } }
>(
  'transaction/pay',
  async (_arg, { getState, dispatch, rejectWithValue }) => {
    let { checkout } = getState();
    if (!checkout.idempotencyKey) {
      dispatch(paymentAttemptStarted(newIdempotencyKey()));
      checkout = getState().checkout;
    }
    const { payment, summary } = getState();

    try {
      const transaction = await apiRequest<Transaction>('/transactions', {
        method: 'POST',
        headers: { 'Idempotency-Key': checkout.idempotencyKey! },
        body: JSON.stringify({
          productId: checkout.productId,
          quantity: checkout.quantity,
          customer: {
            fullName: checkout.customer.fullName.trim(),
            email: checkout.customer.email.trim(),
            phone: checkout.customer.phone.replace(/[\s-]/g, ''),
          },
          delivery: {
            addressLine1: checkout.delivery.addressLine1.trim(),
            addressLine2: checkout.delivery.addressLine2.trim() || undefined,
            city: checkout.delivery.city.trim(),
            region: checkout.delivery.region.trim(),
            postalCode: checkout.delivery.postalCode.trim() || undefined,
          },
          payment: {
            cardToken: payment.cardToken,
            installments: checkout.installments,
            cardBrand: checkout.card?.brand,
            cardLastFour: checkout.card?.lastFour,
            acceptanceToken: summary.acceptance.data?.acceptanceToken,
            personalDataAuthToken:
              summary.acceptance.data?.personalDataAuthToken,
          },
        }),
      });
      dispatch(transactionCreated(transaction.id));
      return transaction;
    } catch (error) {
      return rejectWithValue(
        error instanceof ApiError
          ? { message: error.message, status: error.status }
          : { message: PAY_ERROR_MESSAGE, status: 500 },
      );
    }
  },
  {
    // A second click while paying does nothing.
    condition: (_arg, { getState }) =>
      getState().transaction.status !== 'loading',
  },
);

export const LOAD_ERROR_MESSAGE = 'No pudimos consultar el estado de tu pago.';

/**
 * Reads the transaction by id: used after a refresh (the result is
 * recovered from the persisted id) and to poll a PENDING payment. The
 * backend syncs a PENDING transaction with the gateway on every read.
 */
export const fetchTransaction = createAsyncThunk<
  Transaction,
  string,
  { rejectValue: { message: string; status: number } }
>('transaction/fetch', async (id, { rejectWithValue }) => {
  try {
    return await apiRequest<Transaction>(
      `/transactions/${encodeURIComponent(id)}`,
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof ApiError
        ? { message: error.message, status: error.status }
        : { message: LOAD_ERROR_MESSAGE, status: 500 },
    );
  }
});

const transactionSlice = createSlice({
  name: 'transaction',
  initialState: initialTransactionState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(payTransaction.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.errorStatus = null;
      })
      .addCase(payTransaction.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
      })
      .addCase(payTransaction.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message ?? PAY_ERROR_MESSAGE;
        state.errorStatus = action.payload?.status ?? null;
      })
      .addCase(fetchTransaction.pending, (state) => {
        // While polling, keep showing the last known transaction.
        if (!state.current) state.status = 'loading';
      })
      .addCase(fetchTransaction.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload;
        state.error = null;
        state.errorStatus = null;
      })
      .addCase(fetchTransaction.rejected, (state, action) => {
        // A failed poll is not fatal if we already show a transaction.
        if (state.current) return;
        state.status = 'failed';
        state.error = action.payload?.message ?? LOAD_ERROR_MESSAGE;
        state.errorStatus = action.payload?.status ?? null;
      })
      .addCase(checkoutFinished, () => initialTransactionState)
      .addCase(paymentRetried, () => initialTransactionState);
  },
});

export const transactionReducer = transactionSlice.reducer;
