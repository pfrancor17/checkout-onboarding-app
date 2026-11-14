import { ConflictException } from '@nestjs/common';
import { conflict } from '../../../shared/domain/app-error';
import { err, ok } from '../../../shared/domain/result';
import { GetQuoteUseCase } from '../../application/get-quote.use-case';
import { buildOrder } from '../../domain/transaction.fixture';
import { QuotesController } from './quotes.controller';

describe('QuotesController', () => {
  const getQuote = { execute: jest.fn() };
  const controller = new QuotesController(
    getQuote as unknown as GetQuoteUseCase,
  );

  it('returns the amounts', async () => {
    const { amounts } = buildOrder();
    getQuote.execute.mockResolvedValue(ok(amounts));

    await expect(
      controller.quote({ productId: 'p', quantity: 1 }),
    ).resolves.toEqual(amounts);
    expect(getQuote.execute).toHaveBeenCalledWith('p', 1);
  });

  it('maps errors to HTTP', async () => {
    getQuote.execute.mockResolvedValue(err(conflict('no stock')));

    await expect(
      controller.quote({ productId: 'p', quantity: 9 }),
    ).rejects.toThrow(ConflictException);
  });
});
