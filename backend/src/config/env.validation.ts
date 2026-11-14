import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_RUN_MIGRATIONS: Joi.boolean().default(false),

  // Checkout fees, in cents (COP): 300000 = $3.000, 1000000 = $10.000
  BASE_FEE_IN_CENTS: Joi.number().integer().min(0).default(300000),
  DELIVERY_FEE_IN_CENTS: Joi.number().integer().min(0).default(1000000),

  // Payment gateway (sandbox). Secrets come from env vars, never from code.
  PAYMENT_API_URL: Joi.string().uri({ scheme: 'https' }).required(),
  PAYMENT_PUBLIC_KEY: Joi.string().required(),
  PAYMENT_PRIVATE_KEY: Joi.string().required(),
  PAYMENT_INTEGRITY_SECRET: Joi.string().required(),
  PAYMENT_EVENTS_SECRET: Joi.string().optional(),
  PAYMENT_TIMEOUT_MS: Joi.number().integer().min(1000).default(8000),
  PAYMENT_POLL_ATTEMPTS: Joi.number().integer().min(1).default(10),
  PAYMENT_POLL_INTERVAL_MS: Joi.number().integer().min(100).default(2000),
  // Total polling budget. Worst case = max wait + one request timeout,
  // which must stay under API Gateway's 29 s limit (15 s + 8 s = 23 s).
  PAYMENT_POLL_MAX_WAIT_MS: Joi.number().integer().min(1000).default(15000),
});
