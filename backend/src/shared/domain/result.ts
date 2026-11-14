/**
 * Minimal Result type for Railway Oriented Programming.
 *
 * A use case is a chain of steps on two tracks: the success track (Ok)
 * and the failure track (Err). Once a step fails, the following steps are
 * skipped and the error travels to the end of the chain, where the caller
 * decides what to do with it (e.g. map it to an HTTP status).
 */
export type Result<T, E> = Ok<T, E> | Err<T, E>;

interface ResultMatcher<T, E, R> {
  ok: (value: T) => R;
  err: (error: E) => R;
}

export class Ok<T, E> {
  readonly isOk = true as const;
  readonly isErr = false as const;

  constructor(readonly value: T) {}

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }

  mapErr<F>(): Result<T, F> {
    return new Ok(this.value);
  }

  andThen<U, F>(fn: (value: T) => Result<U, F>): Result<U, E | F> {
    return fn(this.value);
  }

  async andThenAsync<U, F>(
    fn: (value: T) => Promise<Result<U, F>>,
  ): Promise<Result<U, E | F>> {
    return fn(this.value);
  }

  match<R>(matcher: ResultMatcher<T, E, R>): R {
    return matcher.ok(this.value);
  }
}

export class Err<T, E> {
  readonly isOk = false as const;
  readonly isErr = true as const;

  constructor(readonly error: E) {}

  map<U>(): Result<U, E> {
    return new Err(this.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Err(fn(this.error));
  }

  andThen<U, F>(): Result<U, E | F> {
    return new Err(this.error);
  }

  andThenAsync<U, F>(): Promise<Result<U, E | F>> {
    return Promise.resolve(new Err(this.error));
  }

  match<R>(matcher: ResultMatcher<T, E, R>): R {
    return matcher.err(this.error);
  }
}

export const ok = <T, E = never>(value: T): Result<T, E> => new Ok(value);

export const err = <E, T = never>(error: E): Result<T, E> => new Err(error);

/** Runs a promise and moves any thrown error onto the failure track. */
export const fromPromise = async <T, E>(
  promise: Promise<T>,
  onError: (cause: unknown) => E,
): Promise<Result<T, E>> => {
  try {
    return ok(await promise);
  } catch (cause) {
    return err(onError(cause));
  }
};
