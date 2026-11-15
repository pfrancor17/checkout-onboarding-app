import { env } from '../../config/env';
import { ApiError, apiRequest } from '../../shared/api/httpClient';
import { onlyDigits, parseExpiry } from './cardValidation';

export interface CardInput {
  number: string;
  holder: string;
  expiry: string; // MM/YY
  cvc: string;
}

interface TokenResponse {
  data: { id: string; brand: string; last_four: string };
}

export const TOKENIZE_ERROR_MESSAGE =
  'No pudimos validar tu tarjeta. Revisa los datos e inténtalo de nuevo.';

/**
 * Sends the card straight to the payment gateway (with its PUBLIC key) and
 * gets back a token. The raw card data never reaches our backend and is
 * never put in the Redux store or localStorage: only the token goes on.
 *
 * Deliberately a plain function, not a thunk: a thunk would copy its
 * argument (the card number) into the Redux actions.
 */
export const tokenizeCard = async (card: CardInput): Promise<string> => {
  const expiry = parseExpiry(card.expiry);
  try {
    const response = await apiRequest<TokenResponse>(
      '/tokens/cards',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.paymentPublicKey}` },
        body: JSON.stringify({
          number: onlyDigits(card.number),
          cvc: card.cvc,
          exp_month: expiry?.month,
          exp_year: expiry?.year,
          card_holder: card.holder.trim(),
        }),
      },
      env.paymentApiUrl,
    );
    return response.data.id;
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) throw error;
    throw new ApiError(
      error instanceof ApiError ? error.status : 500,
      TOKENIZE_ERROR_MESSAGE,
    );
  }
};
