import { ErrorResult, OkayResult, Result } from "./result";
import { toString } from "./utils";

/** Maybe "some" type value, maybe "none" */
export type Maybe<T> = MaybeValue<T> | MaybeNone;
/** A `Promise` to a `Maybe` */
export type PromiseMaybe<T> = Promise<Maybe<T>>;

type MaybeValueType<T extends Maybe<any>> =
  T extends MaybeValue<infer U> ? U : never;
type MaybeValueTypes<T extends Maybe<any>[]> = {
  [key in keyof T]: T[key] extends Maybe<any> ? MaybeValueType<T[key]> : never;
};

/**
 * Base interface for both MaybeValue and MaybeNone.
 */
interface BaseMaybe<T>
  extends Iterable<T extends Iterable<infer U> ? U : never> {
  /** `true` when this has "some" value. */
  readonly isValue: boolean;
  /** `false` when this is "none". */
  readonly isNone: boolean;

  /**
   * Returns the "some" value, or throw.
   * Use if you want a "none" value to throw an error.
   *
   * @returns the "some" value
   * @throws NoneError when "none".
   */
  unwrap(): T;

  /**
   * Unwrap the "some" value and return it,
   * or when "none" returns the given alternative instead.
   *
   * @param altValue value to return when "none"
   * @returns the "some" value, or `altValue` when "none"
   */
  unwrapOr<T2>(altValue: T2): T | T2;

  /**
   * Unwrap the "some" value and return it,
   * or-else when "none" returns the given alternative lazy callback instead.
   *
   * @param altValueFn lazy callback result to return when "none"
   * @returns the "some" value, or the `altValueFn` result when "none"
   */
  unwrapOrElse<T2>(altValueFn: () => T2): T | T2;

  /**
   * Returns the "some" value or `null` instead of throwing an error if "none".
   *
   * @returns the "some" value, or `null` when "none"
   */
  unwrapOrNull(): T | null;

  /**
   * Returns the "some" value, if exists. Throws when "none".
   *
   * @param altError (optional) `Error`, message for an `Error`, or callback that produces an `Error` to throw when "none"
   * @returns the "some" value
   * @throws the `altError` or `NoneError` when "none".
   */
  unwrapOrThrow<E extends Error>(altError?: string | Error | (() => E)): T;

  /**
   * Assert that this `Maybe` has "some" value.
   * Throw with provided message (or a default) when not "some" value.
   * Generally you should use an unwrap function instead, but this is useful for unit testing.
   *
   * @param message the message to throw when this is "none"
   * @returns the "some" value
   * @throws `new NoneError(message)` when is "none"
   */
  assertIsValue(message?: string): T;

  /**
   * Assert that this `Maybe` is "none".
   * Throw with provided message (or a default) when not "none".
   * Generally, prefer to handle the "none" case explicitly or with `unwrapOr` or `unwrapOrNull`.
   * This may be useful for unit testing.
   *
   * @param message the message to throw when "some".
   * @returns the "none"
   * @throws `new Error(msg,value)` when "some"
   */
  assertIsNone(message?: string): Maybe.None;

  /**
   * Perform boolean "or" operation.
   *
   * Returns `this` when "some", otherwise returns `other`.
   *
   * @param other the right-hand operator
   * @returns "none" or `other`.
   */
  or<T2>(other: Maybe<T2>): Maybe<T> | Maybe<T2>;

  /**
   * Perform a lazy boolean "or" operation.
   *
   * Returns `this` when "some", or-else returns the `otherFn` callback result.
   *
   * @param otherFn the right-hand operator
   * @returns "none" or `otherFn` result.
   */
  orElse<T2>(otherFn: () => Maybe<T2>): Maybe<T> | Maybe<T2>;

  /**
   * Perform boolean "and" operation.
   *
   * Returns "none" if this is "none", otherwise returns `other`.
   *
   * @param other the right-hand operator
   * @returns "none" or `other`.
   */
  and<T2>(other: Maybe<T2>): Maybe<T2> | Maybe.None;

  /**
   * Perform a lazy boolean "and" operation by
   * chaining a "some" value into a mapper function.
   *
   * Calls `mapperFn` when "some" value,
   * otherwise returns itself as still "none" without calling `mapperFn`.
   *
   * @param mapperFn function to map this value to another `Maybe`. (See `.map` to map values instead.)
   * @returns mapped "some" value, or `this` when "none".
   */
  andThen<T2>(mapperFn: (value: T) => Maybe<T2>): Maybe<T2> | Maybe.None;

  /**
   * Transform "some" value, when present.
   *
   * Maps an `Maybe<T>` to `Maybe<U>` by applying a function to the "some" value,
   * leaving a "none" untouched.
   *
   * This function can be used to compose the `Maybe` of two functions.
   *
   * @param mapperFn function to map this value to a new value.
   *                 (See `.andThen` to map to a new `Maybe` instead.)
   * @returns a new `Maybe` with the mapped "some" value, or `this` when "none"
   */
  map<U>(mapperFn: (value: T) => U): Maybe<U>;

  /**
   * Transform "some" value or use an alternative, resulting in a Maybe that is always "some" value.
   *
   * Maps a `Maybe<T>` to `Maybe<U>` by either converting `T` to `U` using `mapperFn` (in case
   * of "some") or using the `altValue` value (in case of "none").
   *
   * If `altValue` is a result of a function call consider using `mapOrElse` instead, it will
   * only evaluate the function when needed.
   *
   * @param mapperFn function to map this "some" value to a new value.
   * @param altValue value to return when "none"
   * @returns a new `Maybe` with the mapped "okay" value or the `altValue` value
   */
  mapOr<U>(mapperFn: (value: T) => U, altValue: U): MaybeValue<U>;

  /**
   * Transform "some" value or-else lazy call an alternative, resulting in a Maybe that is always "some" value.

   * Maps a `Maybe<T>` to `Maybe<U>` by either converting `T` to `U` using `mapperFn` (in case
   * of "some") or using the `altValueFn` callback value (in case of "none").
   *
   * @param mapperFn function to map this "some" value to a new value.
   * @param altValueFn callback result to return when "none"
   * @returns a new `Maybe` with the mapped "okay" value or the alternative result value
   */
  mapOrElse<U>(mapperFn: (value: T) => U, altValueFn: () => U): MaybeValue<U>;

  /**
   * Filters "some" value to "none" if `predicateFn` returns `false`.
   *
   * When "some", calls the `predicateFn` and if it returns `false` returns "none".
   * When "none", returns `this` unchanged and predicate not called.
   *
   * @param predicateFn filter function indicating whether to keep (`true`) the value
   * @returns this `Maybe` or `Maybe.None`.
   */
  filter(predicateFn: (value: T) => boolean): Maybe<T>;

  /**
   * Convert a `Maybe<T>` to a `Result<T, E>`, with the provided `Error` value
   * to use when this is "none".
   *
   * @param error to use when "none"; defaults to a `NoneError`
   * @return a `Result` with this "some" as the "okay" value, or `error` as the "error".
   */
  toResult<E>(error?: E): Result<T, E | NoneError>;

  /**
   * This `Maybe` as a loggable string.
   * @returns string describing this `Maybe`
   */
  toString(): string;
}

/**
 * Contains Maybe's "none" value
 */
class MaybeNone implements BaseMaybe<never> {
  readonly isValue = false as const;
  readonly isNone = true as const;

  /**
   * Helper function if you know you have a `Maybe<T>` and `T` is iterable
   * @returns iterator that is immediately done
   */
  [Symbol.iterator](): Iterator<never, never, any> {
    return {
      next(): IteratorResult<never, never> {
        return { done: true, value: undefined! };
      },
    };
  }

  unwrap(): never {
    throw new NoneError();
  }

  unwrapOr<T2>(altValue: T2): T2 {
    return altValue;
  }

  unwrapOrElse<T2>(altValueFn: () => T2): T2 {
    return altValueFn();
  }

  unwrapOrNull(): null {
    return null;
  }

  unwrapOrThrow<E extends Error>(altError?: string | Error | (() => E)): never {
    if (!altError) {
      this.unwrap(); // sub-class MaybeNotFound overloads this
    } else if (altError instanceof Error) {
      throw altError;
    } else if (typeof altError === "function") {
      throw altError();
    } else {
      throw new NoneError(altError);
    }
  }

  assertIsValue(message?: string): never {
    throw new NoneError(message);
  }

  assertIsNone(_message?: string): Maybe.None {
    return this;
  }

  or<T2>(other: Maybe<T2>): Maybe<T2> {
    return other;
  }

  orElse<T2>(otherFn: () => Maybe<T2>): Maybe<T2> {
    return otherFn();
  }

  and<T2>(_other: Maybe<T2>): Maybe.None {
    return this;
  }

  andThen<T2>(_mapperFn: (value: never) => Maybe<T2>): Maybe.None {
    return this;
  }

  map<U>(_mapperFn: (value: never) => U): Maybe.None {
    return this;
  }

  mapOr<U>(_mapperFn: (value: never) => U, altValue: U): MaybeValue<U> {
    return new MaybeValue(altValue);
  }

  mapOrElse<U>(
    _mapperFn: (value: never) => U,
    altValueFn: () => U,
  ): MaybeValue<U> {
    return new MaybeValue(altValueFn());
  }

  filter(_predicateFn: (value: never) => boolean): Maybe.None {
    return this;
  }

  toResult<E>(error?: E): ErrorResult<E | NoneError> {
    return new ErrorResult(error ?? new NoneError());
  }

  toString(): string {
    return "None";
  }
}

/** Error that is thrown if you unwrap a "none" `Maybe` */
export class NoneError extends Error {
  /**
   * Constructor
   * @param message (optional) message for the `Error`
   */
  constructor(message?: string) {
    super(message ?? "Maybe is none");
  }
}

/**
 * A special form of Maybe's "none" value with additional context.
 */
class MaybeNotFound extends MaybeNone {
  /**
   * Construct a `Maybe` "none" that indicates a "what" wasn't found.
   * @param what texts describing "what" wasn't found.
   */
  constructor(private readonly what: string[]) {
    super();
  }

  unwrap(): never {
    throw new NotFoundError("NotFound: " + this.what.join(" "));
  }
}

/** HTTP-friendly `Error` that is thrown when unwrapping a `MaybeNotFound` */
export class NotFoundError extends Error {
  /** Property use by some HTTP servers */
  readonly status = 404 as const;
  /** Property use by some HTTP servers */
  readonly statusCode = 404 as const;

  constructor(msg: string) {
    super(msg);
  }
}

/**
 * Contains a success "some" value.
 *
 * @typeParam type of the "some" value
 */
class MaybeValue<T> implements BaseMaybe<T> {
  readonly isValue = true as const;
  readonly isNone = false as const;

  /**
   * Helper function if you know you have a `Maybe<T>` and `T` is iterable.
   * @returns value's iterator or an iterator that is immediately done, if value is not iterable.
   */
  [Symbol.iterator](): Iterator<T extends Iterable<infer U> ? U : never> {
    const obj = Object(this.value) as Iterable<any>;

    return Symbol.iterator in obj
      ? obj[Symbol.iterator]()
      : {
          next(): IteratorResult<never, never> {
            return { done: true, value: undefined! };
          },
        };
  }

  /**
   * Creates a `Maybe<T>` with a "some" value.
   */
  constructor(public readonly value: T) {
    // Protect against nesting
    if (value instanceof MaybeValue) {
      this.value = value.value;
    }
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr<T2>(_altValue: T2): T {
    return this.value;
  }

  unwrapOrElse<T2>(_altValueFn: () => T2): T {
    return this.value;
  }

  unwrapOrNull(): T {
    return this.value;
  }

  unwrapOrThrow<E extends Error>(_altError?: string | Error | (() => E)): T {
    return this.value;
  }

  assertIsValue(_message?: string): T {
    return this.value;
  }

  assertIsNone(message?: string): Maybe.None {
    throw new Error(message ?? `Expected None, have ${this.toString()}`);
  }

  or<T2>(_other: Maybe<T2>): Maybe<T> {
    return this;
  }

  orElse<T2>(_otherFn: () => Maybe<T2>): Maybe<T> {
    return this;
  }

  and<T2>(other: Maybe<T2>): Maybe<T2> {
    return other;
  }

  andThen<T2>(mapperFn: (value: T) => Maybe<T2>): Maybe<T2> {
    return mapperFn(this.value);
  }

  map<U>(mapperFn: (value: T) => U): MaybeValue<U> {
    return new MaybeValue<U>(mapperFn(this.value));
  }

  mapOr<U>(mapperFn: (value: T) => U, _altValue: U): MaybeValue<U> {
    return new MaybeValue(mapperFn(this.value));
  }

  mapOrElse<U>(mapperFn: (value: T) => U, _altValueFn: () => U): MaybeValue<U> {
    return new MaybeValue<U>(mapperFn(this.value));
  }

  filter(predicateFn: (value: T) => boolean): Maybe<T> {
    return predicateFn(this.value) ? this : Maybe.None;
  }

  toResult<E>(_error: E): OkayResult<T> {
    return new OkayResult(this.value);
  }

  toString(): string {
    return `Value(${toString(this.value)})`;
  }
}

/** Export helpers within the Maybe namespace */
export namespace Maybe {
  /*
   * Export generic None and Empty as singletons, then freeze them.
   */

  /** Generic None result of a Maybe */
  export const None = new MaybeNone();
  export type None = MaybeNone;
  Object.freeze(None);

  /** A Successful Maybe result that just doesn't have any value */
  export const Empty = new MaybeValue<void>(undefined);
  export type Empty = MaybeValue<void>;
  Object.freeze(Empty);

  /*
   * Construction factories
   */

  /** Factory create a `Maybe` with "some" value */
  export const withValue = <T>(value: T) => new MaybeValue(value);

  /**
   * Factory create a `Maybe` of "none" with context of "what" was not found.
   * @param what string(s) describing what wasn't found
   */
  export const notFound = (...what: string[]) => new MaybeNotFound(what);

  /**
   * Factory create a `Maybe` with a "none" result. You can use the `Maybe.None` singleton directly;
   * this just provides synchronicity with the other factory functions.
   */
  export const asNone = () => None;

  /**
   * Factory create a `Maybe` with success but no actual value (`void`).
   * You can use the Empty singleton directly instead;
   * this just provides synchronicity with the other factory functions.
   */
  export const empty = () => Empty;

  /**
   * Helper to wrap a value as a `Maybe`.
   *
   * @param value a value, undefined, or null
   * @return a `Maybe`: "none" if `undefined` or `null`, otherwise "some" value.
   */
  export const wrap = <T>(value: T | undefined | null) =>
    value == null ? None : new MaybeValue(value);

  /**
   * Returns the value contained in `maybe`, or throws if "none".
   * Same as `maybe.unwrap()`, but more readable when `maybe` is returned from an async
   * function: `Maybe.unwrap(await repository.get(id))`
   *
   * @param maybe to unwrap
   * @return the "some" value
   * @throws NoneError if `maybe` is "none".
   */
  export const unwrap = <T>(maybe: Maybe<T>) => maybe.unwrap();

  /**
   * Returns the "some" value in `maybe`, or `null` if "none".
   * Same as `maybe.unwrapOrNull()`, but more readable when `maybe` is returned from an
   * async function: `Maybe.unwrapOrNull(await repository.get(id))`
   *
   * @param maybe to unwrap
   * @return the "some" value or `null`
   */
  export const unwrapOrNull = <T>(maybe: Maybe<T>) => maybe.unwrapOrNull();

  /**
   * Parse a set of `maybes`, returning an array of all "some" values.
   * Short circuits with the first "none" found, if any
   *
   * @param maybes list to check
   * @return array of "some" values or `Maybe.None`.
   */
  export function allOrNone<T extends Maybe<any>[]>(
    ...maybes: T
  ): Maybe<MaybeValueTypes<T>> {
    const someValues = [];
    for (const maybe of maybes) {
      if (maybe.isValue) {
        someValues.push(maybe.value);
      } else {
        return maybe;
      }
    }

    return new MaybeValue(someValues as MaybeValueTypes<T>);
  }

  /**
   * Parse a set of `maybes`, returning an array of all "some" values,
   * filtering out any "none"s found, if any.
   *
   * @param maybes list to check
   * @return array of some" values
   */
  export function allValues<T>(...maybes: Maybe<T>[]): T[] {
    return maybes
      .filter((maybe) => maybe.isValue)
      .map((maybe) => maybe.unwrap());
  }

  /**
   * Parse a set of `maybes`, short-circuits when an input value is "some".
   * If no "some" is found, returns a "none".
   * @param maybes list to check
   * @return the first "some" value given, or otherwise "none".
   */
  export function any<T extends Maybe<any>[]>(
    ...maybes: T
  ): Maybe<MaybeValueTypes<T>[number]> {
    // short-circuits
    for (const maybe of maybes) {
      if (maybe.isValue) {
        return maybe as MaybeValue<MaybeValueTypes<T>[number]>;
      }
    }

    // it must be None
    return None;
  }

  /**
   * Type-guard to identify and narrow a `Maybe`
   */
  export function isMaybe<T>(value: unknown): value is Maybe<T> {
    return value instanceof MaybeValue || value instanceof MaybeNone;
  }
}
