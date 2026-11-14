export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: Date;
}

/** Output port: customers are created during checkout, here only read. */
export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
}

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');
