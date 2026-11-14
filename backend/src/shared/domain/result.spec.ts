import { err, fromPromise, ok, Result } from './result';

const parsePositive = (n: number): Result<number, string> =>
  n > 0 ? ok(n) : err('not positive');

describe('Result (Railway Oriented Programming)', () => {
  describe('success track', () => {
    it('map transforms the value', () => {
      const result = ok<number, string>(2).map((n) => n * 10);
      expect(result.isOk && result.value).toBe(20);
    });

    it('mapErr leaves an Ok untouched', () => {
      const result = ok<number, string>(2).mapErr((e) => e.length);
      expect(result.isOk && result.value).toBe(2);
    });

    it('andThen chains a step that can fail', () => {
      expect(ok<number, string>(3).andThen(parsePositive).isOk).toBe(true);
      expect(ok<number, string>(-1).andThen(parsePositive).isErr).toBe(true);
    });

    it('andThenAsync chains an async step', async () => {
      const result = await ok<number, string>(4).andThenAsync((n) =>
        Promise.resolve(ok(n + 1)),
      );
      expect(result.isOk && result.value).toBe(5);
    });

    it('match calls the ok branch', () => {
      const output = ok(1).match({ ok: (v) => `ok:${v}`, err: () => 'err' });
      expect(output).toBe('ok:1');
    });
  });

  describe('failure track', () => {
    const failed = err<string, number>('boom');

    it('map, andThen and andThenAsync skip the step', async () => {
      const step = jest.fn();
      expect(failed.map(step).isErr).toBe(true);
      expect(failed.andThen(step).isErr).toBe(true);
      expect((await failed.andThenAsync(step)).isErr).toBe(true);
      expect(step).not.toHaveBeenCalled();
    });

    it('mapErr transforms the error', () => {
      const result = failed.mapErr((e) => e.toUpperCase());
      expect(result.isErr && result.error).toBe('BOOM');
    });

    it('match calls the err branch', () => {
      const output = failed.match({ ok: () => 'ok', err: (e) => `err:${e}` });
      expect(output).toBe('err:boom');
    });
  });

  describe('fromPromise', () => {
    it('wraps a resolved promise in Ok', async () => {
      const result = await fromPromise(Promise.resolve(7), () => 'failed');
      expect(result.isOk && result.value).toBe(7);
    });

    it('moves a rejection onto the failure track', async () => {
      const result = await fromPromise(
        Promise.reject(new Error('db down')),
        (cause) => `failed: ${(cause as Error).message}`,
      );
      expect(result.isErr && result.error).toBe('failed: db down');
    });
  });
});
