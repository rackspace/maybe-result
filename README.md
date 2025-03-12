# maybe-result - Safe function return handling in Typescript and Javascript

Deciding when a function should return `undefined`, throw an `Error`, or return some other indicator that
"something isn't right" is tough. We don't always know how users _calling_ our function
will use it, and we want to be clear, clean, and safe.

This library provides two approaches for wrapping function results:

- [Maybe](#maybe) for when something may or may not exist
- [Result](#result) for when you might have an error, but want to let the caller decide how to handle it

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

---

There are many other functions both on the `Maybe` instance and static helper functions in
the `Maybe` namespace.

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

## API Use

Both `Maybe` and `Result` have many more member and static functions. Learn more:

- [API Documentation](https://www.jsdocs.io/package/maybe-result)
- Full coverage examples in the [Maybe unit test suite](src/maybe.spec.ts) and [Result unit test suite](src/result.spec.ts).
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
