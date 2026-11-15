import {
  checkoutStarted,
  initialCheckoutState,
} from '../features/checkout/checkoutSlice';
import {
  migratePersistedState,
  persistConfig,
  persistor,
  setupStore,
  store,
} from './store';

describe('store', () => {
  it('setupStore creates an isolated store with optional preloaded state', () => {
    const testStore = setupStore({
      checkout: { ...initialCheckoutState, step: 'SUMMARY', productId: 'p' },
    });

    expect(testStore.getState().checkout.step).toBe('SUMMARY');
  });

  it('persists only whitelisted slices under a versioned key', () => {
    expect(persistConfig).toMatchObject({
      key: 'checkout-app',
      version: 2,
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

  describe('migratePersistedState', () => {
    it('fills fields missing from an older saved state', async () => {
      const old = {
        checkout: { step: 'SUMMARY', productId: 'p', quantity: 2 },
        _persist: { version: 1, rehydrated: true },
      };

      const migrated = (await migratePersistedState(
        old as never,
      )) as unknown as {
        checkout: typeof initialCheckoutState;
      };

      expect(migrated.checkout).toEqual({
        ...initialCheckoutState,
        step: 'SUMMARY',
        productId: 'p',
        quantity: 2,
      });
    });

    it('keeps the saved delivery data', async () => {
      const saved = {
        checkout: { delivery: { city: 'Cali' } },
        _persist: { version: 2, rehydrated: true },
      };

      const migrated = (await migratePersistedState(
        saved as never,
      )) as unknown as {
        checkout: typeof initialCheckoutState;
      };

      expect(migrated.checkout.delivery).toEqual({
        ...initialCheckoutState.delivery,
        city: 'Cali',
      });
    });

    it('leaves an empty storage untouched', async () => {
      await expect(migratePersistedState(undefined)).resolves.toBeUndefined();
    });
  });
});
