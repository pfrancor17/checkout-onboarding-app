/** GET /api/quotes: price breakdown calculated by the backend. */
export interface Quote {
  unitPriceInCents: number;
  quantity: number;
  productAmountInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalAmountInCents: number;
  currency: string;
}

/** GET /api/payments/acceptance-tokens: legal acceptances for the gateway. */
export interface AcceptanceTokens {
  acceptanceToken: string;
  termsUrl: string;
  personalDataAuthToken: string;
  personalDataPolicyUrl: string;
}
