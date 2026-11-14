/** Shape returned by GET /api/products. */
export interface Product {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: string;
  stock: number;
  available: boolean;
  imageUrl: string | null;
}

/** Same rule as the backend: at most this many units per order. */
export const MAX_UNITS_PER_ORDER = 5;
