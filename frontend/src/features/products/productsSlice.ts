import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { ApiError, apiRequest } from '../../shared/api/httpClient';
import type { Product } from './types';

export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface ProductsState {
  items: Product[];
  status: RequestStatus;
  error: string | null;
}

export const initialProductsState: ProductsState = {
  items: [],
  status: 'idle',
  error: null,
};

/**
 * Always fetched fresh (never persisted): stock changes after every
 * purchase, so the product page must show the current units.
 */
export const fetchProducts = createAsyncThunk<
  Product[],
  void,
  { rejectValue: string }
>('products/fetch', async (_arg, { rejectWithValue }) => {
  try {
    return await apiRequest<Product[]>('/products');
  } catch (error) {
    return rejectWithValue(
      error instanceof ApiError
        ? error.message
        : 'No pudimos cargar los productos.',
    );
  }
});

const productsSlice = createSlice({
  name: 'products',
  initialState: initialProductsState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'No pudimos cargar los productos.';
      });
  },
});

export const productsReducer = productsSlice.reducer;

export const selectProducts = (state: RootState) => state.products.items;
export const selectProductsStatus = (state: RootState) => state.products.status;
export const selectProductsError = (state: RootState) => state.products.error;
export const selectProductById = (state: RootState, id: string | null) =>
  state.products.items.find((product) => product.id === id) ?? null;
