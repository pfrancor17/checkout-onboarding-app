import { env } from '../../config/env';

/** Error with the HTTP status, so the UI can react (e.g. 409 = no stock). */
export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const NETWORK_ERROR_MESSAGE =
  'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.';

/** NestJS errors come as { message: string | string[] }. */
const extractMessage = (body: unknown): string | null => {
  if (!body || typeof body !== 'object' || !('message' in body)) return null;
  const { message } = body as { message: unknown };
  if (Array.isArray(message)) return message.join('. ');
  return typeof message === 'string' ? message : null;
};

export const apiRequest = async <T>(
  path: string,
  init: RequestInit = {},
  baseUrl: string = env.apiUrl,
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch (cause) {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE, cause);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractMessage(body) ?? `La solicitud falló (HTTP ${response.status})`,
      body,
    );
  }
  return body as T;
};
