/**
 * Errors that travel on the failure track of a use case.
 * They describe *what* went wrong in business terms; the HTTP layer
 * decides how to expose them.
 */
export type AppErrorCode =
  'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' | 'PAYMENT_GATEWAY' | 'UNEXPECTED';

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

export const unexpected = (cause?: unknown): AppError => ({
  code: 'UNEXPECTED',
  message: 'An unexpected error occurred',
  cause,
});
