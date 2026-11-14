import type { Storage as PersistStorage } from 'redux-persist';

/**
 * localStorage adapter for redux-persist.
 *
 * Written by hand instead of importing 'redux-persist/lib/storage': that
 * file is CommonJS and, once bundled by Vite (ESM), its default import is
 * the module wrapper, not the storage, so the app crashed on load.
 *
 * It also never throws: if the browser blocks storage (private mode,
 * full quota), the app keeps working without persistence.
 */
export const createSafeStorage = (
  getBackend: () => Storage | undefined = () => window.localStorage,
): PersistStorage => {
  function attempt<T>(action: (backend: Storage) => T, fallback: T): T {
    try {
      const backend = getBackend();
      return backend ? action(backend) : fallback;
    } catch {
      return fallback;
    }
  }

  return {
    getItem: (key: string) =>
      Promise.resolve(attempt((backend) => backend.getItem(key), null)),
    setItem: (key: string, value: string) =>
      Promise.resolve(
        attempt((backend) => backend.setItem(key, value), undefined),
      ),
    removeItem: (key: string) =>
      Promise.resolve(attempt((backend) => backend.removeItem(key), undefined)),
  };
};
