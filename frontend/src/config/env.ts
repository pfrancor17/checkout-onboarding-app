/**
 * Runtime configuration from Vite env vars (VITE_*), read in one place.
 * Only public values belong here: everything in the bundle is visible to
 * the browser. The gateway PUBLIC key is meant to be public; private keys
 * live only in the backend.
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  paymentApiUrl: import.meta.env.VITE_PAYMENT_API_URL ?? '',
  paymentPublicKey: import.meta.env.VITE_PAYMENT_PUBLIC_KEY ?? '',
};
