import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  const validEnv = {
    DB_HOST: 'localhost',
    DB_USER: 'checkout',
    DB_PASSWORD: 'checkout',
    DB_NAME: 'checkout',
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
});
