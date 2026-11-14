/**
 * Errors that travel on the failure track of a use case.
 * They describe *what* went wrong in business terms; the HTTP layer
 * decides how to expose them.
 */
export type AppErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'PAYMENT_GATEWAY'
  | 'GATEWAY_UNAVAILABLE'
  | 'UNEXPECTED';

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

export const notFound = (message: string): AppError => ({
  code: 'NOT_FOUND',
  message,
});

export const validationError = (message: string): AppError => ({
  code: 'VALIDATION',
  message,
});

export const conflict = (message: string): AppError => ({
  code: 'CONFLICT',
  message,
});

export const paymentGatewayError = (
  message: string,
  cause?: unknown,
): AppError => ({ code: 'PAYMENT_GATEWAY', message, cause });

/**
 * The gateway did not answer (network error, timeout or 5xx). Unlike
 * PAYMENT_GATEWAY (a clear rejection), the outcome is UNKNOWN: the request
 * may have been processed, so a payment must not be assumed to have failed.
 */
export const gatewayUnavailable = (
  message: string,
  cause?: unknown,
): AppError => ({ code: 'GATEWAY_UNAVAILABLE', message, cause });

export const unexpected = (cause?: unknown): AppError => ({
  code: 'UNEXPECTED',
  message: 'An unexpected error occurred',
  cause,
});
