import { PaymentGateway } from '../../payments/domain/payment-gateway.port';
import { ProductRepository } from '../../products/domain/product.repository';
import { TransactionRepository } from '../domain/transaction.repository';

/** Test helpers: jest mocks for every port the checkout depends on. */
export const mockProductRepository = (): jest.Mocked<ProductRepository> => ({
  findAll: jest.fn(),
  findById: jest.fn(),
});

export const mockTransactionRepository =
  (): jest.Mocked<TransactionRepository> => ({
    createPending: jest.fn(),
    findById: jest.fn(),
    findByIdempotencyKey: jest.fn(),
    attachGatewayTransaction: jest.fn(),
    finalize: jest.fn(),
  });

export const mockPaymentGateway = (): jest.Mocked<PaymentGateway> => ({
  getAcceptanceTokens: jest.fn(),
  createCardPayment: jest.fn(),
  getTransaction: jest.fn(),
  findTransactionByReference: jest.fn(),
});
