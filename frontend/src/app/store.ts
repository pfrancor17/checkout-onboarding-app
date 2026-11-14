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
} from 'redux-persist';
import { checkoutReducer } from '../features/checkout/checkoutSlice';
import { productsReducer } from '../features/products/productsSlice';
import { createSafeStorage } from './persistStorage';

export const rootReducer = combineReducers({
  checkout: checkoutReducer,
  products: productsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * Progress survives a page refresh via localStorage.
 * Only whitelisted slices are persisted. Card data (number, CVC, expiry)
 * is NEVER put in the store: it lives only inside the payment form and
 * is sent straight to the gateway to be tokenized.
 */
export const persistConfig = {
  key: 'checkout-app',
  version: 1,
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
