export type TransactionStatus =
  'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

/** Response of POST /api/transactions and GET /api/transactions/:id. */
export interface Transaction {
  id: string;
  reference: string;
  status: TransactionStatus;
  statusMessage: string | null;
  product: { id: string; name: string };
  amounts: {
    unitPriceInCents: number;
    quantity: number;
    productAmountInCents: number;
    baseFeeInCents: number;
    deliveryFeeInCents: number;
    totalAmountInCents: number;
    currency: string;
  };
  card: { brand: 'VISA' | 'MASTERCARD'; lastFour: string };
  customer: { id: string; fullName: string; email: string };
  delivery: {
    id: string;
    status: 'PENDING' | 'ASSIGNED' | 'CANCELLED';
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    region: string;
    postalCode: string | null;
  };
  createdAt: string;
  updatedAt: string;
}
