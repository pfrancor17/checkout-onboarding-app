import { DeliveryStatus } from '../../transactions/domain/transaction';

export interface Delivery {
  id: string;
  transactionId: string;
  status: DeliveryStatus;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string;
  postalCode: string | null;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Output port: deliveries are created during checkout, here only read. */
export interface DeliveryRepository {
  findById(id: string): Promise<Delivery | null>;
}

export const DELIVERY_REPOSITORY = Symbol('DELIVERY_REPOSITORY');
