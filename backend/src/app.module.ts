import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDatabaseOptions } from './config/database.config';
import { envValidationSchema } from './config/env.validation';
import { CustomersModule } from './customers/customers.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { HealthModule } from './health/health.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildDatabaseOptions({
          NODE_ENV: config.get('NODE_ENV'),
          DB_HOST: config.get('DB_HOST'),
          DB_PORT: config.get('DB_PORT'),
          DB_USER: config.get('DB_USER'),
          DB_PASSWORD: config.get('DB_PASSWORD'),
          DB_NAME: config.get('DB_NAME'),
          DB_SSL: String(config.get('DB_SSL')),
          DB_RUN_MIGRATIONS: String(config.get('DB_RUN_MIGRATIONS')),
        }),
        autoLoadEntities: true,
      }),
    }),
    HealthModule,
    ProductsModule,
    PaymentsModule,
    TransactionsModule,
    CustomersModule,
    DeliveriesModule,
  ],
})
export class AppModule {}
