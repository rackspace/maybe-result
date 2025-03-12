# maybe-result - Safe function return handling in Typescript and Javascript

Deciding when a function should return `undefined`, throw an `Error`, or return some other indicator that
"something isn't right" is tough. We don't always know how users _calling_ our function
will use it, and we want to be clear, clean, and safe.

This library provides two approaches for wrapping function results:

- [Maybe](#maybe) for when something may or may not exist. (Jump to [API](#maybe-api))
- [Result](#result) for when you might have an error, but want to let the caller decide how to handle it. (Jump to [API](#result-api))

Jump to [Learn More](#learn-more) section - Jump to [Origins and Alternatives](#origin-and-alternatives) section

## Maybe

In many languages, we have concepts of exceptions and `null` values.
(JavaScript has both `null` and `undefined`. Ugh!)

Often a function will need to indicate when a value _maybe_ exists, or it does not.
In JavaScript, the "does not" is usually returned as `undefined` or `null`, but sometimes
a function will _throw_ an `Error` type instead. Thus, the developer needs to figure out
how that particular function behaves and adapt to that if they want to handle
the missing value.

Finally, throwing Errors in TypeScript can be expensive, as a stack trace must be
generated and cross-referenced to the `.js.map` files. These stack traces to your
TypeScript source are immensely useful for tracing actual errors, but they are wasted
processing when ignored.

The `Maybe` type makes this cleaner. Elm was an early language that defined this.
Rust has an `Option` type, which is the same concept.

A `Maybe` is a wrapper object that contains either "some" value, or "none".
A function can thus return a `Maybe`, and the client can then _choose_ how to handle
the possibly missing value. The caller can explicitly check for `isValue` or
`isNone`, or can simply `unwrap` the `Maybe` and let it throw an error if "none".
It is now the caller's choice. There are many other helper functions too, such as
to unwrap with a default value to return in place of throwing if `isNone`.

In JavaScript we like to throw `Error` types, but in other languages we call these _exceptions_.
**Throwing is still good for _exceptional_ cases. `Maybe` is for "normal" control flows.**

`Maybe` is not only for function return values. It may be used elsewhere where you want a type-safe
and immutable alternative to `undefined` and `null`.

Here's a nice introduction to the concept:
[Implementing a Maybe Pattern using a TypeScript Type Guard](https://medium.com/@sitapati/implementing-a-maybe-pattern-using-a-typescript-type-guard-81b55efc0af0)

### Example by Story

You might define a data repository class (access to a data store) like this:

```ts
class WidgetRepository {
  get(widgetID: string): Promise<Widget> {
    // implementation ...
  }
}
```

If the Widget isn't found, you throw a `NotFoundError`. All is well until you start _expecting_
a Widget not to be found. That becomes valid flow, so you find yourself writing this a lot:

```ts
let widget: Widget | undefined;
try {
  widget = await widgetRepo.get(widgetID);
} catch (error) {
  if (!(error instanceof NotFoundError)) {
    throw error;
  }
}

if (widget) {
  /* ... */
}
```

You may be willing to do that once... but not more. So you first try to change the repository:

```ts
class WidgetRepository {
  get(widgetID: string): Promise<Widget | undefined> {
    // implementation ...
  }
}
```

Now it returns `undefined` instead of throwing. Oh, but what a hassle - now you have to _check_ for
`undefined` _every time_ you call the function! So instead, you define _two_ functions:

```ts
class WidgetRepository {
  getOrThrow(widgetID: string): Promise<Widget> {
    // implementation ...
  }
  getIfFound(widgetID: string): Promise<Widget | undefined> {
    // implementation ...
  }
}
```

That makes it easier. It works. You just have to write _two_ functions every time you write a get function. 🙄

**OR...** use `Maybe` 🎉

```ts
class WidgetRepository {
  async get(widgetID: string): PromiseMaybe<Widget> {
    // implementation ...
  }
}

// One place elsewhere where you want to throw if not found
const widget = Maybe.unwrap(await widgetRepo.get(widgetID));

// Another place elsewhere where you want to handle the mising lookup
const widget = Maybe.unwrapOrNull(await widgetRepo.get(widgetID));
if (widget) {
  // do work
} else {
  // do other work
}

// Someplace where you have a default
const widget = (await widgetRepo.get(widgetID)).unwrapOr(defaultWidget);
```

### Maybe API

There are many functions, both on the `Maybe` instance and as static helper functions in
the `Maybe` namespace:

```ts
interface Maybe<T> extends Iterable<T extends Iterable<infer U> ? U : never> {
  /** `true` when this has "some" value. */
  readonly isValue: boolean;
  /** `false` when this is "none". */
  readonly isNone: boolean;
  /**
   * Helper function if you know you have a `Maybe<T>` and `T` is iterable.
   * @returns value's iterator or an iterator that is immediately done, if value is not iterable.
   */
  [Symbol.iterator](): Iterator<T extends Iterable<infer U> ? U : never>;
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

/** A `Promise` to a `Maybe` */
type PromiseMaybe<T> = Promise<Maybe<T>>;

declare namespace Maybe {
  /** Generic None result of a Maybe */
  const None: MaybeNone;
  type None = MaybeNone;

  /** A Successful Maybe result that just doesn't have any value */
  const Empty: MaybeValue<void>;
  type Empty = MaybeValue<void>;

  /** Factory create a `Maybe` with "some" value */
  const withValue: <T>(value: T) => MaybeValue<T>;
  /**
   * Factory create a `Maybe` of "none" with context of "what" was not found.
   * @param what string(s) describing what wasn't found
   */
  const notFound: (...what: string[]) => MaybeNotFound;
  /**
   * Factory create a `Maybe` with a "none" result. You can use the `Maybe.None` singleton directly;
   * this just provides synchronicity with the other factory functions.
   */
  const asNone: () => MaybeNone;
  /**
   * Factory create a `Maybe` with success but no actual value (`void`).
   * You can use the Empty singleton directly instead;
   * this just provides synchronicity with the other factory functions.
   */
  const empty: () => MaybeValue<void>;
  /**
   * Helper to wrap a value as a `Maybe`.
   *
   * @param value a value, undefined, or null
   * @return a `Maybe`: "none" if `undefined` or `null`, otherwise "some" value.
   */
  const wrap: <T>(
    value: T | undefined | null,
  ) => MaybeNone | MaybeValue<NonNullable<T>>;
  /**
   * Returns the value contained in `maybe`, or throws if "none".
   * Same as `maybe.unwrap()`, but more readable when `maybe` is returned from an async
   * function: `Maybe.unwrap(await repository.get(id))`
   *
   * @param maybe to unwrap
   * @return the "some" value
   * @throws NoneError if `maybe` is "none".
   */
  const unwrap: <T>(maybe: Maybe<T>) => T;
  /**
   * Returns the "some" value in `maybe`, or `null` if "none".
   * Same as `maybe.unwrapOrNull()`, but more readable when `maybe` is returned from an
   * async function: `Maybe.unwrapOrNull(await repository.get(id))`
   *
   * @param maybe to unwrap
   * @return the "some" value or `null`
   */
  const unwrapOrNull: <T>(maybe: Maybe<T>) => T | null;
  /**
   * Parse a set of `maybes`, returning an array of all "some" values.
   * Short circuits with the first "none" found, if any
   *
   * @param maybes list to check
   * @return array of "some" values or `Maybe.None`.
   */
  function allOrNone<T extends Maybe<any>[]>(
    ...maybes: T
  ): Maybe<MaybeValueTypes<T>>;
  /**
   * Parse a set of `maybes`, returning an array of all "some" values,
   * filtering out any "none"s found, if any.
   *
   * @param maybes list to check
   * @return array of some" values
   */
  function allValues<T>(...maybes: Maybe<T>[]): T[];
  /**
   * Parse a set of `maybes`, short-circuits when an input value is "some".
   * If no "some" is found, returns a "none".
   * @param maybes list to check
   * @return the first "some" value given, or otherwise "none".
   */
  function any<T extends Maybe<any>[]>(
    ...maybes: T
  ): Maybe<MaybeValueTypes<T>[number]>;
  /**
   * Type-guard to identify and narrow a `Maybe`
   */
  function isMaybe<T>(value: unknown): value is Maybe<T>;
}

/**
 * A special form of Maybe's "none" value with additional context.
 */
declare class MaybeNotFound extends MaybeNone {
  private readonly what;
  /**
   * Construct a `Maybe` "none" that indicates a "what" wasn't found.
   * @param what texts describing "what" wasn't found.
   */
  constructor(what: string[]);
  unwrap(): never;
}

/** HTTP-friendly `Error` that is thrown when unwrapping a `MaybeNotFound` */
declare class NotFoundError extends Error {
  /** Property use by some HTTP servers */
  readonly status: 404;
  /** Property use by some HTTP servers */
  readonly statusCode: 404;
  constructor(msg: string);
}
```

## Result

Unlike `Maybe`, which simply has some value or no value and doesn't want to return `undefined`,
`Result` is for when you have an **error** and don't want to `throw`.
Similar to `Maybe`, this is all about the function giving the caller the _choice_ of
how to handle a situation - in this case an _exceptional_ situation.

This is modeled off of the Rust `Result` type, but made to pair cleanly with this
implementation of `Maybe`.

### Example

Expanding on the previous example of a `WidgetRepository`,
let's add a function in the repository that creates a new widget.
A `create` function should error out if the assumption that the
widget doesn't yet exist is false.

```ts
class WidgetRepository {
  async create(
    widget: CreatableWidget,
  ): Promise<Result<Widget, ConstraintError>> {
    try {
      // implementation ...
      return Result.okay(newWidget);
    } catch (err) {
      return Result.error(err);
    }
  }
}

/*
 * Elsewhere in the create-widget use-case...
 */
const createResult = await widgetRepo.create(creatableWidget);

if (createResult.isOkay) {
  return createResult.value;
} else {
  // Throw more end-user aligned error instead of the database error
  throw new HttpBadRequest("Widget already exists");
}

/*
 * Or more simply...
 */
const createResult = await widgetRepo.create(creatableWidget);
return createResult.unwrapOrThrow(new HttpBadRequest("Widget already exists"));

/*
 * Or if you just want the behavior of if Result wasn't used, just unwrap it
 * and any contained error will throw.
 */
return (await widgetRepo.create(creatableWidget)).unwrap();
// or slightly more readable:
return Result.unwrap(await widgetRepo.create(creatableWidget));
// or convert to a Maybe, so that Maybe.None is returned in place of the error
return (await widgetRepo.create(creatableWidget)).toMaybe();
```

### Result API

There are many functions, both on the `Result` instance and as static helper functions in
the `Result` namespace:

```ts
interface Result<T, E>
  extends Iterable<T extends Iterable<infer U> ? U : never> {
  /** `true` when this contains an "okay" value */
  readonly isOkay: boolean;
  /** `true` when this contains an "error" value */
  readonly isError: boolean;
  /**
   * Helper function if you know you have a Result<T> and T is iterable
   * @returns iterator over the okay value
   */
  [Symbol.iterator](): Iterator<T extends Iterable<infer U> ? U : never>;
  /**
   * Unwrap the result's "okay" value and return it.
   * When "error", throws the value instead.
   * Generally, prefer to handle the error case explicitly or with `unwrapOr` or `unwrapOrNull`.
   *
   * @returns the "okay" value
   * @throws the "error" value
   */
  unwrap(): T;
  /**
   * Unwrap the result's "okay" value and return it,
   * or when "error", returns given alternative instead.
   *
   * @param altValue value or callback result to return when "error"
   * @returns the "okay" value or the `altValue`.
   */
  unwrapOr<T2>(altValue: T2): T | T2;
  /**
   * Unwrap the result's "okay" value and return it,
   * or-else when "error" calls alternative lazy callback and returns that value.
   *
   * @param altValueFn value or callback result to return when "error"
   * @returns the "okay" value or the `altValueFn` result when "error".
   */
  unwrapOrElse<T2>(altValueFn: (error: E) => T2): T | T2;
  /**
   * Unwrap the result's "okay" value and return it.
   * When "error", returns `null`.
   *
   * @returns the "okay" value or `null`
   */
  unwrapOrNull(): T | null;
  /**
   * Unwrap the result's "okay" value and return it.
   * otherwise if an `altError` is provided, it is thrown,
   * otherwise the "error" value of this result is thrown.
   *
   * When no `altError` parameter is provided, this is the same as `.unwrap()`
   * but a bit more descriptive.
   *
   * @param altError (optional) `Error`, message for an `Error`, or callback that produces an `Error` to throw when "error"
   * @returns "okay" value
   * @throws `altError` or the result "error" value
   */
  unwrapOrThrow<E2 extends Error>(
    altError?: string | Error | ((error: E) => E2),
  ): T;
  /**
   * Assert that this `Result` is "okay".
   * Throw with provided message (or a default) when not "okay".
   * Generally you should use an unwrap function instead, but this is useful for unit testing.
   *
   * @param message the message to throw when this is an "error"
   * @returns the value when this is "okay"
   * @throws `new Error(message,value)` when is "error"
   */
  assertIsOkay(message?: string): T;
  /**
   * Assert that this `Result` is "error".
   * Throw with provided message (or a default) when not "error".
   * Generally, prefer to handle the "error" case explicitly or with `unwrapOr` or `unwrapOrNull`.
   * This may be useful for unit testing.
   *
   * @param message the message to throw when "okay".
   * @returns the value when "error"
   * @throws `new Error(msg,value)` when "okay"
   */
  assertIsError(message?: string): E;
  /**
   * Perform boolean "or" operation.
   *
   * Returns `this` when "okay", otherwise returns `other`.
   *
   * @param other the right-hand operator
   * @returns this "okay" or `other`.
   */
  or<T2, E2>(other: Result<T2, E2>): OkayResult<T> | Result<T2, E2>;
  /**
   * Perform a lazy boolean "or" operation.
   *
   * Returns `this` when "okay", or-else lazy-cals `otherFn` and returns its result.
   *
   * @param otherFn the right-hand operator
   * @returns this "okay" or `otherFn` result.
   */
  orElse<T2>(otherFn: (error: E) => OkayResult<T2>): OkayResult<T | T2>;
  orElse<E2>(otherFn: (error: E) => ErrorResult<E2>): Result<T, E2>;
  orElse<T2, E2>(otherFn: (error: E) => Result<T2, E2>): Result<T | T2, E2>;
  /**
   * Perform boolean "and" operation.
   *
   * When "error", returns this "error",
   * otherwise returns `other`.
   *
   * @param other the right-hand operator
   * @returns this "error" or `other`.
   */
  and<T2, E2>(other: Result<T2, E2>): ErrorResult<E> | Result<T2, E2>;
  /**
   * Perform a lazy boolean "and" operation by
   * chaining the "okay" value into a mapper function.
   *
   * Lazy calls `mapperFn` if the result "okay",
   * otherwise returns this "error" `Result` as-is without calling `mapperFn`.
   *
   * This function can be used for control flow based on `Result` values.
   *
   * @param mapperFn function to map this value to another `Result`. (See `.map` to map values instead.)
   * @returns mapped "okay" `Result` or `this` when "error"
   */
  andThen<T2>(mapperFn: (value: T) => OkayResult<T2>): Result<T2, E>;
  andThen<E2>(mapperFn: (value: T) => ErrorResult<E2>): Result<T, E | E2>;
  andThen<T2, E2>(mapperFn: (value: T) => Result<T2, E2>): Result<T2, E | E2>;
  /**
   * Transform "okay" value, when present.
   *
   * Maps a `Result<T, E>` to `Result<U, E>` by applying a function to the "okay" value,
   * leaving an "error" value unchanged.
   *
   * This function can be used to compose the results of two functions.
   *
   * @param mapperFn function to map this value to a new value.
   *                 (See `.andThen` to map to a new `Result` instead.)
   * @returns a new `Result` with the mapped "okay" value, or `this` when "error"
   */
  map<U>(mapperFn: (value: T) => U): Result<U, E>;
  /**
   * Transform "okay" value or use an alternative, resulting in a `Result` that is always "okay".
   *
   * Maps a `Result<T, E>` to `Result<U, E>` when "okay" by applying a function.
   * When "error", returns given alternative instead.
   *
   * @param mapperFn function to map this value to a new value.
   * @param altValue value to return when "error"
   * @returns a new `Result` with the mapped "okay" value or the `altValue` value
   */
  mapOr<U>(mapperFn: (value: T) => U, altValue: U): OkayResult<U>;
  /**
   * Transform "okay" value or-else lazy call an alternative, resulting in a `Result` that is always "okay".
   *
   * Maps a `Result<T, E>` to `Result<U, E>` when "okay" by applying a function.
   * When "error", returns value from alternative callback instead.
   *
   * @param mapperFn function to map this value to a new value.
   * @param altValueFn callback result to return when "error"
   * @returns a new `Result` with the mapped "okay" value or the alternative value
   */
  mapOrElse<U>(
    mapperFn: (value: T) => U,
    altValueFn: (error: E) => U,
  ): OkayResult<U>;
  /**
   * Transform "error" value, when present.
   *
   * Maps a `Result<T, E>` to `Result<T, F>` by applying a function to an "error" value,
   * leaving an "okay" value unchanged.
   *
   * This function can be used to pass through a successful result while handling an error.
   *
   * @param mapperFn function to map this "error" value to a new error
   * @returns a new `Result` with the mapped error, or `this` when "okay"
   */
  mapError<F>(mapperFn: (error: E) => F): Result<T, F>;
  /**
   * Converts this `Result<T, E>` to `Maybe<T>`,
   * discarding any error details in place of a simple `Maybe.None`.
   * @returns the "okay" value as a `Maybe`, or `Maybe.None` when "error"
   */
  toMaybe(): Maybe<T>;
  /**
   * This `Result` as a loggable string.
   * @returns string describing this `Result`
   */
  toString(): string;
}

/** A `Promise` to a `Result` */
type PromiseResult<T, E> = Promise<Result<T, E>>;

declare namespace Result {
  /** A reusable okay result with no (undefined) value */
  const OkayVoid: OkayResult<void>;
  /** Factory to create an "okay" result */
  const okay: <T>(value: T) => OkayResult<T>;
  /** Factory to create an "okay" result with no (undefined) value */
  const okayVoid: () => OkayResult<void>;
  /** Factory to create an "error" result */
  const error: <E>(error: E) => ErrorResult<E>;

  /**
   * Parse a set of `Result`s, returning an array of all "okay" values.
   * Short circuits to return the first "error" found, if any.
   *
   * @param results array of results; possibly a mix of "okay"s and "error"s
   * @return a single `Result` with the first "error" or an "okay" value as an array of all the "okay" values.
   */
  function all<T extends Result<any, any>[]>(
    ...results: T
  ): Result<OkayResultTypes<T>, ErrorResultTypes<T>[number]>;
  /**
   * Parse a set of `Result`s and returns the first input value that "okay".
   * If no "okay" is found, returns an "error" result with the error values.
   *
   * @param results array of results; possibly a mix of "okay"s and "error"s
   * @return a single `Result` with the first "okay" or an "error" value as an array of all the "error" values.
   */
  function any<T extends Result<any, any>[]>(
    ...results: T
  ): Result<OkayResultTypes<T>[number], ErrorResultTypes<T>>;
  /**
   * Returns the value contained in `result`, or throws the "error" in `result`.
   *
   * Same as `result.unwrap()`, but more reads nicer when `Result` is returned from an async
   * function: `Result.unwrap(await repository.create(widget))`
   *
   * @param result to unwrap
   * @throws if the result is "error"
   */
  const unwrap: <T, E>(result: Result<T, E>) => T;
  /**
   * Wrap an operation that may throw and capture it into a `Result`.
   *
   * @param opFn the operation function
   * @return a `Result` with the function output - either "okay" or a caught "error".
   */
  function wrap<T, E = unknown>(opFn: () => T): Result<T, E>;
  /**
   * Wrap an operation that may throw and capture it into a `Result`.
   *
   * @param opFn the operation function
   * @return a `Result` with the function output - either "okay" or a caught "error".
   */
  function wrapAsync<T, E = unknown>(
    opFn: () => Promise<T>,
  ): PromiseResult<T, E>;
  /**
   * Type guard to identify and narrow a `Result`
   */
  function isResult<T = any, E = any>(val: unknown): val is Result<T, E>;
}
```

## Learn More

- View the [Generated API Documentation](https://www.jsdocs.io/package/maybe-result)
- Read full-coverage examples in the [Maybe unit test suite](src/maybe.spec.ts) and [Result unit test suite](src/result.spec.ts).
- Functions are named per some foundational concepts:
  - `wrap` wraps up a value
  - `unwrap` means to extract the value
  - `or` performs a boolean _or_ operation between two instances
  - `orElse` lazily gets the second operand for an _or_ operation via a callback function _only_ if needed
  - `and` performs a boolean _and_ operation between two instances
  - `andThen` lazily gets the second operand for an _and_ operation via a callback function _only_ if needed
  - `map` functions transform the value to return a new instance (immutably)

## Origin and Alternatives

This implementation is based on [ts-results](https://github.com/vultix/ts-results),
which adheres to the Rust API.
This library has more natual word choices, Promise support, additional functions, and other enhancements.

There are many other libraries that do this same thing - just
[search NPM for "maybe"](https://www.npmjs.com/search?q=maybe).
It is up to you to decide which option is best for your project.

_The goal of this library is to be featureful, safe, and easy to understand without
a study of functional programming._
