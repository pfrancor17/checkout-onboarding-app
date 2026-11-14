import { createSafeStorage } from './persistStorage';

describe('createSafeStorage', () => {
  beforeEach(() => window.localStorage.clear());

  it('reads, writes and removes from localStorage by default', async () => {
    const storage = createSafeStorage();

    await storage.setItem('k', 'v');
    expect(window.localStorage.getItem('k')).toBe('v');
    await expect(storage.getItem('k')).resolves.toBe('v');

    await storage.removeItem('k');
    await expect(storage.getItem('k')).resolves.toBeNull();
  });

  it('never throws when the browser blocks storage (e.g. private mode)', async () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
      removeItem: () => {
        throw new DOMException('denied', 'SecurityError');
      },
    } as unknown as Storage;
    const storage = createSafeStorage(() => blocked);

    await expect(storage.getItem('k')).resolves.toBeNull();
    await expect(storage.setItem('k', 'v')).resolves.toBeUndefined();
    await expect(storage.removeItem('k')).resolves.toBeUndefined();
  });

  it('works when there is no storage at all', async () => {
    const storage = createSafeStorage(() => undefined);

    await expect(storage.getItem('k')).resolves.toBeNull();
  });
});
