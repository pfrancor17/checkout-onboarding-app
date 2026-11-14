import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsModule } from '../payments/payments.module';
import { ProductsModule } from '../products/products.module';
import { CreateTransactionUseCase } from './application/create-transaction.use-case';
import { GetQuoteUseCase } from './application/get-quote.use-case';
import { GetTransactionUseCase } from './application/get-transaction.use-case';
import { CHECKOUT_FEES } from './domain/transaction';
import { TRANSACTION_REPOSITORY } from './domain/transaction.repository';
import { checkoutFeesFactory } from './infrastructure/checkout-fees.config';
import { QuotesController } from './infrastructure/http/quotes.controller';
import { TransactionsController } from './infrastructure/http/transactions.controller';
import { TransactionOrmEntity } from './infrastructure/persistence/transaction.orm-entity';
import { TypeOrmTransactionRepository } from './infrastructure/persistence/typeorm-transaction.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionOrmEntity]),
    ProductsModule,
    PaymentsModule,
  ],
  controllers: [TransactionsController, QuotesController],
  providers: [
    {
      provide: CHECKOUT_FEES,
      inject: [ConfigService],
      useFactory: checkoutFeesFactory,
    },
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: TypeOrmTransactionRepository,
    },
    GetQuoteUseCase,
    CreateTransactionUseCase,
    GetTransactionUseCase,
  ],
})
export class TransactionsModule {}
