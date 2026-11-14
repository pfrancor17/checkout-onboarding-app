import { buildDatabaseOptions } from './database.config';

describe('buildDatabaseOptions', () => {
  const baseEnv = {
    DB_HOST: 'db.local',
    DB_PORT: '5433',
    DB_USER: 'user',
    DB_PASSWORD: 'secret',
    DB_NAME: 'checkout',
  };

  it('maps env vars to postgres options with safe defaults', () => {
    const options = buildDatabaseOptions(baseEnv);

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'db.local',
      port: 5433,
      username: 'user',
      password: 'secret',
      database: 'checkout',
      ssl: false,
      synchronize: false,
      migrationsRun: false,
      logging: ['error'],
    });
  });

  it('enables SSL, auto-migrations and verbose logging when requested', () => {
    const options = buildDatabaseOptions({
      ...baseEnv,
      DB_SSL: 'true',
      DB_RUN_MIGRATIONS: 'TRUE',
      NODE_ENV: 'development',
    });

    expect(options).toMatchObject({
      ssl: { rejectUnauthorized: false },
      migrationsRun: true,
      logging: ['error', 'warn'],
    });
  });

  it('defaults the port to 5432', () => {
    const env: Record<string, string | undefined> = { ...baseEnv };
    delete env.DB_PORT;
    expect(buildDatabaseOptions(env)).toMatchObject({ port: 5432 });
  });
});
