import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateTransactionRequestDto,
  QuoteQueryDto,
} from './create-transaction.request';

const validBody = () => ({
  productId: '6f1c3b5e-8a4d-4b8e-9c2a-1d2e3f4a5b6c',
  quantity: 1,
  customer: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '3001234567',
  },
  delivery: {
    addressLine1: 'Calle 10 # 20-30',
    city: 'Medellín',
    region: 'Antioquia',
  },
  payment: {
    cardToken: 'tok_test_123',
    installments: 1,
    cardBrand: 'VISA',
    cardLastFour: '4242',
    acceptanceToken: 'acc',
    personalDataAuthToken: 'personal',
  },
});

/** Property paths of every validation error, e.g. "customer.email". */
const errorPathsOf = async (body: object) => {
  const dto = plainToInstance(CreateTransactionRequestDto, body);
  const errors = await validate(dto);
  const paths: string[] = [];
  const walk = (list: typeof errors, prefix = '') => {
    for (const error of list) {
      const path = `${prefix}${error.property}`;
      if (error.constraints) paths.push(path);
      walk(error.children ?? [], `${path}.`);
    }
  };
  walk(errors);
  return paths;
};

describe('CreateTransactionRequestDto', () => {
  it('accepts a valid body (optional fields omitted)', async () => {
    await expect(errorPathsOf(validBody())).resolves.toEqual([]);
  });

  it('validates the nested objects (customer, delivery, payment)', async () => {
    const body = validBody();
    body.customer.email = 'not-an-email';
    body.delivery.city = 'M';
    body.payment.cardBrand = 'AMEX';
    body.payment.cardLastFour = '4242424242424242';

    await expect(errorPathsOf(body)).resolves.toEqual([
      'customer.email',
      'delivery.city',
      'payment.cardBrand',
      'payment.cardLastFour',
    ]);
  });

  it('requires the nested objects to be present', async () => {
    const paths = await errorPathsOf({
      productId: validBody().productId,
      quantity: 1,
    });

    expect(paths).toEqual(['customer', 'delivery', 'payment']);
  });

  it.each([
    ['quantity 0', { quantity: 0 }, 'quantity'],
    ['more than 5 units', { quantity: 6 }, 'quantity'],
    ['a non-integer quantity', { quantity: 1.5 }, 'quantity'],
    ['an invalid product id', { productId: 'abc' }, 'productId'],
  ])('rejects %s', async (_case, override, path) => {
    await expect(
      errorPathsOf({ ...validBody(), ...override }),
    ).resolves.toEqual([path]);
  });

  it('validates the optional delivery fields when present', async () => {
    const body = {
      ...validBody(),
      delivery: {
        ...validBody().delivery,
        postalCode: '123',
        addressLine2: '',
      },
    };

    await expect(errorPathsOf(body)).resolves.toEqual(['delivery.postalCode']);
  });
});

describe('QuoteQueryDto', () => {
  it('converts the quantity from the query string', async () => {
    const dto = plainToInstance(QuoteQueryDto, {
      productId: '6f1c3b5e-8a4d-4b8e-9c2a-1d2e3f4a5b6c',
      quantity: '2',
    });

    expect(dto.quantity).toBe(2);
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects an out-of-range quantity', async () => {
    const dto = plainToInstance(QuoteQueryDto, {
      productId: '6f1c3b5e-8a4d-4b8e-9c2a-1d2e3f4a5b6c',
      quantity: '9',
    });

    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toEqual(['quantity']);
  });
});
