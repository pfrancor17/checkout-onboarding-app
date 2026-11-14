import { TransactionDetails } from '../../domain/transaction';
import { TransactionOrmEntity } from './transaction.orm-entity';

/** Maps a transaction loaded with its product, customer and delivery. */
export const toTransactionDetails = (
  entity: TransactionOrmEntity,
): TransactionDetails => {
  const { product, customer, delivery } = entity;
  if (!product || !customer || !delivery) {
    throw new Error(
      `Transaction ${entity.id} must be loaded with product, customer and delivery`,
    );
  }

  return {
    id: entity.id,
    reference: entity.reference,
    status: entity.status,
    statusMessage: entity.statusMessage,
    gatewayTransactionId: entity.gatewayTransactionId,
    product: { id: product.id, name: product.name },
    amounts: {
      unitPriceInCents: entity.unitPriceInCents,
      quantity: entity.quantity,
      productAmountInCents: entity.productAmountInCents,
      baseFeeInCents: entity.baseFeeInCents,
      deliveryFeeInCents: entity.deliveryFeeInCents,
      totalAmountInCents: entity.totalAmountInCents,
      currency: entity.currency,
    },
    card: { brand: entity.cardBrand, lastFour: entity.cardLastFour },
    customer: {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
    },
    delivery: {
      id: delivery.id,
      status: delivery.status,
      addressLine1: delivery.addressLine1,
      addressLine2: delivery.addressLine2,
      city: delivery.city,
      region: delivery.region,
      postalCode: delivery.postalCode,
    },
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
};
