import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

type Env = Record<string, string | undefined>;

const toBoolean = (value: string | undefined): boolean =>
  value?.toLowerCase() === 'true';

/**
 * Builds the TypeORM options from environment variables.
 * Shared by the Nest app and the TypeORM CLI (migrations).
 */
export const buildDatabaseOptions = (env: Env): DataSourceOptions => ({
  type: 'postgres',
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 5432),
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: toBoolean(env.DB_SSL) ? { rejectUnauthorized: false } : false,
  synchronize: false,
  migrationsRun: toBoolean(env.DB_RUN_MIGRATIONS),
  migrations: [join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}')],
  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
