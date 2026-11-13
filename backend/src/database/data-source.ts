import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from '../config/database.config';

/** DataSource used by the TypeORM CLI and the seed script. */
export default new DataSource(buildDatabaseOptions(process.env));
