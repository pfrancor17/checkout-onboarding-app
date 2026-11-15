import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
  type PersistedState,
} from 'redux-persist';
import {
  checkoutReducer,
  initialCheckoutState,
} from '../features/checkout/checkoutSlice';
import { paymentReducer } from '../features/payment/paymentSlice';
import { productsReducer } from '../features/products/productsSlice';
import { summaryReducer } from '../features/summary/summarySlice';
import { transactionReducer } from '../features/transaction/transactionSlice';
import { createSafeStorage } from './persistStorage';

export const rootReducer = combineReducers({
  checkout: checkoutReducer,
  products: productsReducer,
  payment: paymentReducer,
  summary: summaryReducer,
  transaction: transactionReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * Progress survives a page refresh via localStorage.
 * Only the `checkout` slice is persisted (step, product, delivery data,
 * card brand + last 4). NOT persisted: `products` (always fetched fresh)
 * `payment` (the card token, memory only), `summary` (single-use
 * acceptance tokens) and `transaction` (re-fetched by id). Card number, CVC and
 * expiry never enter the store at all.
 */
/**
 * Saved state from an older version of the app may miss newer fields.
 * Merging it over the defaults keeps a returning customer's progress
 * without ever rehydrating an incomplete (crashing) state.
 */
export const migratePersistedState = (
  state: PersistedState,
): Promise<PersistedState> => {
  if (!state) return Promise.resolve(state);
  const saved = (state as { checkout?: Partial<typeof initialCheckoutState> })
    .checkout;
  return Promise.resolve({
    ...state,
    checkout: {
      ...initialCheckoutState,
      ...saved,
      customer: { ...initialCheckoutState.customer, ...saved?.customer },
      delivery: { ...initialCheckoutState.delivery, ...saved?.delivery },
    },
  } as PersistedState);
};

export const persistConfig = {
  key: 'checkout-app',
  version: 2,
  migrate: migratePersistedState,
  storage: createSafeStorage(),
  whitelist: ['checkout'] as Array<keyof RootState>,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const setupStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
  });

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist actions carry functions; they are safe to ignore.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
