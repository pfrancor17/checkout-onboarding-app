import { checkoutStarted } from '../features/checkout/checkoutSlice';
import { persistConfig, persistor, setupStore, store } from './store';

describe('store', () => {
  it('setupStore creates an isolated store with optional preloaded state', () => {
    const testStore = setupStore({
      checkout: {
        step: 'SUMMARY',
        productId: 'p',
        quantity: 1,
        transactionId: null,
      },
    });

    expect(testStore.getState().checkout.step).toBe('SUMMARY');
  });

  it('persists only whitelisted slices under a versioned key', () => {
    expect(persistConfig).toMatchObject({
      key: 'checkout-app',
      version: 1,
      whitelist: ['checkout'],
    });
  });

  it('the app store saves the checkout progress to localStorage', async () => {
    store.dispatch(checkoutStarted({ productId: 'prod-1', quantity: 1 }));
    await persistor.flush();

    const saved = JSON.parse(
      window.localStorage.getItem('persist:checkout-app') ?? '{}',
    ) as Record<string, string>;
    expect(JSON.parse(saved.checkout)).toMatchObject({
      step: 'PAYMENT_FORM',
      productId: 'prod-1',
    });
  });
});
