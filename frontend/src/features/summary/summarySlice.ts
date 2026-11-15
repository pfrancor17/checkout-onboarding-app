import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError, apiRequest } from '../../shared/api/httpClient';
import { checkoutFinished, summaryDismissed } from '../checkout/checkoutSlice';
import type { RequestStatus } from '../products/productsSlice';
import type { AcceptanceTokens, Quote } from './types';

interface Loadable<T> {
  data: T | null;
  status: RequestStatus;
  error: string | null;
}

export interface SummaryState {
  quote: Loadable<Quote>;
  acceptance: Loadable<AcceptanceTokens>;
  termsAccepted: boolean;
  personalDataAccepted: boolean;
}

const idle = { data: null, status: 'idle', error: null } as const;

export const initialSummaryState: SummaryState = {
  quote: { ...idle },
  acceptance: { ...idle },
  termsAccepted: false,
  personalDataAccepted: false,
};

const messageOf = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

/** Amounts always come from the backend: the UI never adds fees itself. */
export const fetchQuote = createAsyncThunk<
  Quote,
  { productId: string; quantity: number },
  { rejectValue: string }
>(
  'summary/fetchQuote',
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({
        productId,
        quantity: String(quantity),
      });
      return await apiRequest<Quote>(`/quotes?${query.toString()}`);
    } catch (error) {
      return rejectWithValue(messageOf(error, 'No pudimos calcular el total.'));
    }
  },
);

/** Single-use tokens: fetched fresh every time the summary is shown. */
export const fetchAcceptanceTokens = createAsyncThunk<
  AcceptanceTokens,
  void,
  { rejectValue: string }
>('summary/fetchAcceptanceTokens', async (_arg, { rejectWithValue }) => {
  try {
    return await apiRequest<AcceptanceTokens>('/payments/acceptance-tokens');
  } catch (error) {
    return rejectWithValue(
      messageOf(error, 'No pudimos cargar los términos y condiciones.'),
    );
  }
});

const summarySlice = createSlice({
  name: 'summary',
  initialState: initialSummaryState,
  reducers: {
    termsAcceptanceChanged(state, action: { payload: boolean }) {
      state.termsAccepted = action.payload;
    },
    personalDataAcceptanceChanged(state, action: { payload: boolean }) {
      state.personalDataAccepted = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuote.pending, (state) => {
        state.quote = { data: null, status: 'loading', error: null };
      })
      .addCase(fetchQuote.fulfilled, (state, action) => {
        state.quote = {
          data: action.payload,
          status: 'succeeded',
          error: null,
        };
      })
      .addCase(fetchQuote.rejected, (state, action) => {
        state.quote = {
          data: null,
          status: 'failed',
          error: action.payload ?? 'No pudimos calcular el total.',
        };
      })
      .addCase(fetchAcceptanceTokens.pending, (state) => {
        state.acceptance = { data: null, status: 'loading', error: null };
      })
      .addCase(fetchAcceptanceTokens.fulfilled, (state, action) => {
        state.acceptance = {
          data: action.payload,
          status: 'succeeded',
          error: null,
        };
      })
      .addCase(fetchAcceptanceTokens.rejected, (state, action) => {
        state.acceptance = {
          data: null,
          status: 'failed',
          error:
            action.payload ?? 'No pudimos cargar los términos y condiciones.',
        };
      })
      // Leaving the summary: acceptances must be given again next time.
      .addCase(summaryDismissed, () => initialSummaryState)
      .addCase(checkoutFinished, () => initialSummaryState);
  },
});

export const { termsAcceptanceChanged, personalDataAcceptanceChanged } =
  summarySlice.actions;
export const summaryReducer = summarySlice.reducer;
