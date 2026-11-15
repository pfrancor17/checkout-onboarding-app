import {
  ApiError,
  apiRequest,
  NETWORK_ERROR_MESSAGE,
} from '../../shared/api/httpClient';
import { tokenizeCard, TOKENIZE_ERROR_MESSAGE } from './cardTokenizer';

jest.mock('../../shared/api/httpClient', () => ({
  ...jest.requireActual('../../shared/api/httpClient'),
  apiRequest: jest.fn(),
}));
const apiRequestMock = jest.mocked(apiRequest);

const card = {
  number: '4242 4242 4242 4242',
  holder: '  Jane Doe ',
  expiry: '12/29',
  cvc: '123',
};

describe('tokenizeCard', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('sends the card to the gateway with the public key and returns the token', async () => {
    apiRequestMock.mockResolvedValue({
      data: { id: 'tok_test_1', brand: 'VISA', last_four: '4242' },
    });

    await expect(tokenizeCard(card)).resolves.toBe('tok_test_1');

    const [path, init, baseUrl] = apiRequestMock.mock.calls[0];
    expect(path).toBe('/tokens/cards');
    expect(baseUrl).toBe('https://gateway.test/v1');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ Authorization: 'Bearer pub_test_123' });
    expect(JSON.parse(init?.body as string)).toEqual({
      number: '4242424242424242',
      cvc: '123',
      exp_month: '12',
      exp_year: '29',
      card_holder: 'Jane Doe',
    });
  });

  it('turns a gateway rejection into a friendly message', async () => {
    apiRequestMock.mockRejectedValue(
      new ApiError(422, 'INPUT_VALIDATION_ERROR'),
    );

    await expect(tokenizeCard(card)).rejects.toMatchObject({
      status: 422,
      message: TOKENIZE_ERROR_MESSAGE,
    });
  });

  it('keeps the network error message', async () => {
    apiRequestMock.mockRejectedValue(new ApiError(0, NETWORK_ERROR_MESSAGE));

    await expect(tokenizeCard(card)).rejects.toMatchObject({
      status: 0,
      message: NETWORK_ERROR_MESSAGE,
    });
  });

  it('handles unexpected errors', async () => {
    apiRequestMock.mockRejectedValue(new TypeError('boom'));

    await expect(tokenizeCard(card)).rejects.toMatchObject({
      status: 500,
      message: TOKENIZE_ERROR_MESSAGE,
    });
  });
});
