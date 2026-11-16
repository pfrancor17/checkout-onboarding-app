import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  const validEnv = {
    DB_HOST: 'localhost',
    DB_USER: 'checkout',
    DB_PASSWORD: 'checkout',
    DB_NAME: 'checkout',
    PAYMENT_API_URL: 'https://gateway.test/v1',
    PAYMENT_PUBLIC_KEY: 'pub_test',
    PAYMENT_PRIVATE_KEY: 'prv_test',
    PAYMENT_INTEGRITY_SECRET: 'integrity_test',
    PAYMENT_EVENTS_SECRET: 'events_test',
  };

  it('accepts a minimal env and applies defaults', () => {
    const { error, value } = envValidationSchema.validate(validEnv) as {
      error?: Error;
      value: Record<string, unknown>;
    };

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      DB_PORT: 5432,
      DB_SSL: false,
      DB_RUN_MIGRATIONS: false,
    });
  });

  it('rejects a missing database password', () => {
    const env: Record<string, string> = { ...validEnv };
    delete env.DB_PASSWORD;
    const { error } = envValidationSchema.validate(env);

    expect(error?.message).toContain('DB_PASSWORD');
  });

  it('rejects an invalid NODE_ENV', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      NODE_ENV: 'staging',
    });

    expect(error?.message).toContain('NODE_ENV');
  });

  it('rejects a payment gateway URL that is not HTTPS', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      PAYMENT_API_URL: 'http://gateway.test/v1',
    });

    expect(error?.message).toContain('PAYMENT_API_URL');
  });

  it('requires the events secret (webhook signatures)', () => {
    const env: Record<string, string> = { ...validEnv };
    delete env.PAYMENT_EVENTS_SECRET;

    const { error } = envValidationSchema.validate(env);

    expect(error?.message).toContain('PAYMENT_EVENTS_SECRET');
  });

  it('accepts DATABASE_URL in place of the individual DB_* values', () => {
    const env: Record<string, string> = {
      ...validEnv,
      DATABASE_URL: 'postgresql://user:secret@db.internal:5432/checkout',
    };
    delete env.DB_HOST;
    delete env.DB_USER;
    delete env.DB_PASSWORD;
    delete env.DB_NAME;

    expect(envValidationSchema.validate(env).error).toBeUndefined();
  });

  it('rejects a DATABASE_URL that is not a postgres URL', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      DATABASE_URL: 'mysql://user:secret@db.internal/checkout',
    });

    expect(error?.message).toContain('DATABASE_URL');
  });
});
