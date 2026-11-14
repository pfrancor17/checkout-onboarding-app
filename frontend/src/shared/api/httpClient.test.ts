import { ApiError, apiRequest, NETWORK_ERROR_MESSAGE } from './httpClient';

const response = (status: number, body: unknown, isJson = true) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () =>
      isJson ? Promise.resolve(body) : Promise.reject(new SyntaxError('html')),
  }) as Response;

describe('apiRequest', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  it('calls the API base URL with JSON headers and returns the body', async () => {
    fetchMock.mockResolvedValue(response(200, [{ id: 1 }]));

    const data = await apiRequest<{ id: number }[]>('/products');

    expect(data).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/products', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('keeps custom headers and options', async () => {
    fetchMock.mockResolvedValue(response(201, {}));

    await apiRequest('/transactions', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'k-1' },
    });

    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'k-1',
      },
    });
  });

  it('can call another base URL (e.g. the payment gateway)', async () => {
    fetchMock.mockResolvedValue(response(200, {}));

    await apiRequest('/tokens/cards', {}, 'https://gateway.test/v1');

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://gateway.test/v1/tokens/cards',
    );
  });

  it('throws an ApiError with the backend message', async () => {
    fetchMock.mockResolvedValue(
      response(409, { message: 'Only 1 unit(s) available', statusCode: 409 }),
    );

    await expect(apiRequest('/quotes')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Only 1 unit(s) available',
    });
  });

  it('joins validation messages', async () => {
    fetchMock.mockResolvedValue(
      response(400, { message: ['email is invalid', 'phone is required'] }),
    );

    await expect(apiRequest('/x')).rejects.toThrow(
      'email is invalid. phone is required',
    );
  });

  it('uses a generic message when the body has none', async () => {
    fetchMock.mockResolvedValue(response(502, '<html>', false));

    await expect(apiRequest('/x')).rejects.toThrow(
      'La solicitud falló (HTTP 502)',
    );
  });

  it('ignores a message that is not text', async () => {
    fetchMock.mockResolvedValue(response(500, { message: { nested: true } }));

    await expect(apiRequest('/x')).rejects.toThrow('HTTP 500');
  });

  it('throws status 0 with a friendly message on network errors', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = (await apiRequest('/x').catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE);
  });
});
