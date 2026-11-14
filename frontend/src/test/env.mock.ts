/** Replaces src/config/env.ts in Jest (import.meta is Vite-only). */
export const env = {
  apiUrl: 'http://api.test/api',
  paymentApiUrl: 'https://gateway.test/v1',
  paymentPublicKey: 'pub_test_123',
};
