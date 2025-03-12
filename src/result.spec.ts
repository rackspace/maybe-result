import { Maybe } from "./maybe";
import { Result } from "./result";

describe("Result", () => {
  describe("as Error", () => {
    const uutError = new Error("Boom!");
    const otherError = new Error("Other");
    const uut = Result.error(uutError);

    test("has identifying properties", () => {
      expect(uut.isError).toBe(true);
      expect(uut.isOkay).toBe(false);
      expect(uut.stack).toMatch(/^Error\(Error: Boom!\)\n/);
    });

    test("is identified with type guard", () => {
      expect(Result.isResult(uut)).toBeTruthy();
      expect(Result.isResult("sunday")).toBeFalsy();
    });

    test("can be unwrapped", () => {
      expect(() => uut.unwrap()).toThrow(uutError);

      expect(uut.unwrapOr(3)).toBe(3);
      expect(uut.unwrapOrElse((err) => err.message)).toEqual("Boom!");
      expect(uut.unwrapOrNull()).toBeNull();

      expect(() => uut.unwrapOrThrow()).toThrow(uutError);
      expect(() => uut.unwrapOrThrow("hello")).toThrow("hello");
      expect(() => uut.unwrapOrThrow(otherError)).toThrow(otherError);
      expect(() => uut.unwrapOrThrow(() => otherError)).toThrow(otherError);
    });

    test("can be asserted", () => {
      expect(() => uut.assertIsOkay()).toThrow(
        /^Expected Okay - Error\(Error: Boom!\)\n/,
      );
      expect(() => uut.assertIsOkay("Failed")).toThrow(
        /^Failed - Error\(Error: Boom!\)\n/,
      );
      expect(uut.assertIsError("ignore")).toEqual(uutError);
    });

    test("can be combined with another Result", () => {
      const otherErr = Result.error(otherError);
      const otherOkay = Result.okay(42);

      expect(uut.or(otherErr)).toEqual(otherErr);
      expect(uut.or(otherOkay)).toEqual(otherOkay);

      expect(uut.orElse((_err) => otherErr)).toEqual(otherErr);
      expect(uut.orElse((_err) => otherOkay)).toEqual(otherOkay);

      expect(uut.and(otherErr)).toEqual(uut);
      expect(uut.and(otherOkay)).toEqual(uut);

      expect(uut.andThen(() => otherErr)).toBe(uut);
      expect(uut.andThen(() => otherOkay)).toBe(uut);
    });

    test("can be transformed", () => {
      expect(uut.map((_value) => -1)).toBe(uut);

      expect(uut.mapOr(() => -1, 42)).toEqual(Result.okay(42));
      expect(
        uut.mapOrElse(
          () => "nop",
          (err) => err.name,
        ),
      ).toEqual(Result.okay("Error"));

      const mappedError = uut.mapError(() => otherError);
      expect(mappedError.assertIsError("expected error")).toEqual(otherError);

      expect(uut.toMaybe()).toEqual(Maybe.None);

      // Re-wrap value
      const wrapToOkay = Result.okay(uut);
      expect(wrapToOkay.assertIsOkay("expected okay")).toEqual(uutError);
      const singleWrapError = Result.error(uut);
      expect(singleWrapError.assertIsError("unexpected")).toEqual(uutError);
    });

    test("can be stringified", () => {
      expect(uut.toString()).toEqual("Error(Error: Boom!)");
    });

    test("has empty iterator", () => {
      let index = 0;
      for (const _item of Result.error(new Error())) {
        index++;
      }
      expect(index).toBe(0);
    });
  });

  describe("as Okay", () => {
    const uutValue = { id: 2, name: "happy" };
    const otherError = new Error("Other");
    const uut = Result.okay(uutValue);

    test("has identifying properties", () => {
      expect(uut.isError).toBe(false);
      expect(uut.isOkay).toBe(true);
    });

    test("is identified with type guard", () => {
      expect(Result.isResult(uut)).toBeTruthy();
      expect(Result.isResult(1)).toBeFalsy();
    });

    test("can be unwrapped", () => {
      expect(uut.unwrap()).toBe(uutValue);
      expect(uut.safeUnwrap()).toEqual(uutValue);

      expect(uut.unwrapOr(3)).toBe(uutValue);
      expect(uut.unwrapOrElse((_err) => null)).toEqual(uutValue);
      expect(uut.unwrapOrNull()).toEqual(uutValue);

      expect(uut.unwrapOrThrow()).toBe(uutValue);
      expect(uut.unwrapOrThrow("fail")).toBe(uutValue);
      expect(uut.unwrapOrThrow(otherError)).toBe(uutValue);
      expect(uut.unwrapOrThrow((_err) => otherError)).toBe(uutValue);
    });

    test("can be asserted", () => {
      expect(uut.assertIsOkay("ignore")).toEqual(uutValue);
      expect(() => uut.assertIsError()).toThrow(
        /^Expected Error - Okay\({"id":2,"name":"happy"}\)/,
      );
      expect(() => uut.assertIsError("Failed")).toThrow(
        /^Failed - Okay\({"id":2,"name":"happy"}\)/,
      );
    });

    test("can be combined with another Result", () => {
      const otherErr = Result.error(otherError);
      const otherOkay = Result.okay(42);

      expect(uut.or(otherErr)).toEqual(uut);
      expect(uut.or(otherOkay)).toEqual(uut);

      expect(uut.orElse((_err) => otherErr)).toEqual(uut);
      expect(uut.orElse((_err) => otherOkay)).toEqual(uut);

      expect(uut.and(otherErr)).toEqual(otherErr);
      expect(uut.and(otherOkay)).toEqual(otherOkay);

      expect(uut.andThen(() => otherErr)).toBe(otherErr);
      expect(uut.andThen(() => otherOkay)).toBe(otherOkay);
      expect(
        uut.andThen((value) => Result.okay({ ...value, id: value.id + 1 })),
      ).toEqual(Result.okay({ id: 3, name: "happy" }));
    });

    test("can be transformed", () => {
      expect(uut.map((value) => value.id + 1)).toEqual(Result.okay(3));

      expect(uut.mapOr((value) => value.id + 2, 0)).toEqual(Result.okay(4));
      expect(
        uut.mapOrElse(
          (value) => value.id + 3,
          (_err) => undefined,
        ),
      ).toEqual(Result.okay(5));

      expect(uut.mapError(() => otherError)).toEqual(uut);

      expect(uut.toMaybe()).toEqual(Maybe.withValue(uutValue));

      // Re-wrap value
      const wrapToError = Result.error(uut);
      expect(wrapToError.assertIsError("unexpected")).toEqual(uutValue);
      const singleWrapOkay = Result.okay(uut);
      expect(singleWrapOkay.assertIsOkay("unexpected")).toEqual(uutValue);
    });

    test("can be stringified", () => {
      expect(uut.toString()).toEqual('Okay({"id":2,"name":"happy"})');
    });

    test("has void value", () => {
      const uut = Result.okayVoid();

      expect(uut.isOkay).toBe(true);
      expect(uut.isError).toBe(false);
      expect(uut.unwrap()).toBe(undefined);
      expect(uut.unwrapOrNull()).toBe(undefined);
      expect(uut.map(() => 3)).toEqual(Result.okay(3));
      expect(uut.safeUnwrap()).toEqual(undefined);

      expect(uut.toMaybe()).toEqual(Maybe.withValue(undefined));
      expect(uut.toString()).toEqual("Okay(undefined)");
    });

    test("has iterator with values", () => {
      let index = 0;
      for (const _item of Result.okay([1, 2])) {
        index++;
      }
      expect(index).toBe(2);
    });
  });

  describe("all are okay", () => {
    test("with okay values", () => {
      const okay1 = Result.okayVoid();
      const okay2 = Result.okay(2);
      const okay3 = Result.okay("yes");

      expect(Result.all(okay1, okay2, okay3)).toEqual(
        Result.okay([undefined, 2, "yes"]),
      );
    });

    test("with an error value", () => {
      const okay1 = Result.okay("yes");
      const error2 = Result.error(new Error("no"));

      expect(Result.all(okay1, error2)).toEqual(error2);
    });
  });

  describe("any are okay", () => {
    test("with okay value", () => {
      const error1 = Result.error(new Error("no"));
      const okay2 = Result.okay("yes");

      expect(Result.any(error1, okay2)).toEqual(okay2);
    });

    test("with all error values", () => {
      const error1 = new Error("false");
      const error2 = new Error("no");

      const results = Result.any(Result.error(error1), Result.error(error2));
      expect(results.assertIsError("should be error")).toEqual([
        error1,
        error2,
      ]);
    });
  });

  describe("wrap a function", () => {
    test("when the function returns a value", () => {
      const result = Result.wrap(() => 42);
      expect(result.assertIsOkay("expected 42")).toBe(42);
    });

    test("when the function throws", () => {
      const result = Result.wrap(() => {
        throw new Error("Boom");
      });
      expect(result.assertIsError("expected to throw")).toEqual(
        new Error("Boom"),
      );
    });
  });

  describe("unwrap a Result", () => {
    test("when the Result is an error", () => {
      const uutError = new Error("Boom!");
      const uut = Result.error(uutError);
      expect(() => uut.unwrap()).toThrow(uutError);
    });

    test("when the Result is okay", () => {
      const uut = Result.okay(80);
      expect(uut.unwrap()).toBe(80);
    });
  });

  describe("wrap an async function", () => {
    test("when the function returns a value", async () => {
      const result = await Result.wrapAsync(() => Promise.resolve(42));
      expect(result.assertIsOkay("expected 42")).toBe(42);
    });

    test("when the function throws asynchronously", async () => {
      const result = await Result.wrapAsync(async () => {
        throw new Error("Boom");
      });
      expect(result.assertIsError("expected to throw")).toEqual(
        new Error("Boom"),
      );
    });

    test("when the function throws synchronously", async () => {
      const result = await Result.wrapAsync(() => {
        throw new Error("Boom");
      });
      expect(result.assertIsError("expected to throw")).toEqual(
        new Error("Boom"),
      );
    });
  });
});
