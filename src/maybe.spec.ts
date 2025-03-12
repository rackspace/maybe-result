import { Maybe, NoneError, NotFoundError } from "./maybe";
import { Result } from "./result";
import isMaybe = Maybe.isMaybe;

describe("Maybe", () => {
  describe("with None", () => {
    const uut = Maybe.asNone();

    test("has identifying properties", () => {
      expect(uut).toBe(Maybe.None);
      expect(uut.isNone).toBe(true);
      expect(uut.isValue).toBe(false);
    });

    test("is identified with type guard", () => {
      expect(Maybe.isMaybe(uut)).toBeTruthy();
      expect(Maybe.isMaybe("sunday")).toBeFalsy();
    });

    test("can be unwrapped", () => {
      expect(() => uut.unwrap()).toThrow(NoneError);

      expect(uut.unwrapOr("hello")).toEqual("hello");
      expect(uut.unwrapOrElse(() => 42)).toEqual(42);

      expect(() => uut.unwrapOrThrow()).toThrow(NoneError);
      expect(() => uut.unwrapOrThrow("hello")).toThrow(NoneError);
      const myError = new Error("mine");
      expect(() => uut.unwrapOrThrow(myError)).toThrow(myError);
      expect(() => uut.unwrapOrThrow(() => myError)).toThrow(myError);

      expect(uut.unwrapOrNull()).toBeNull();
    });

    test("can be asserted", () => {
      expect(() => uut.assertIsValue()).toThrow(NoneError);
      expect(() => uut.assertIsValue("missing")).toThrow("missing");
      expect(uut.assertIsNone()).toEqual(Maybe.None);
    });

    test("can be combined with another Maybe", () => {
      const other = Maybe.withValue(2);

      expect(uut.or(Maybe.None)).toBe(Maybe.None);
      expect(uut.or(other)).toBe(other);
      expect(uut.orElse(() => other)).toBe(other);

      expect(uut.and(Maybe.None)).toBe(Maybe.None);
      expect(uut.and(other)).toBe(Maybe.None);
      expect(uut.andThen(() => Maybe.None)).toBe(Maybe.None);
      expect(uut.andThen(() => other)).toBe(Maybe.None);
    });

    test("can be transformed", () => {
      expect(uut.map(() => true)).toBe(Maybe.None);
      expect(uut.mapOr(() => "that", "orThis")).toEqual(
        Maybe.withValue("orThis"),
      );
      expect(
        uut.mapOrElse(
          (_value) => "mapped",
          () => "otherwise",
        ),
      ).toEqual(Maybe.withValue("otherwise"));

      expect(uut.filter((_value) => true)).toBe(Maybe.None);

      const resultError = new Error("mine");
      expect(uut.toResult(resultError)).toEqual({
        ...Result.error(resultError),
        _stack: expect.any(String),
      });
    });

    test("can be stringified", () => {
      expect(uut.toString()).toEqual("None");
    });

    test("has empty iterator", () => {
      let index = 0;
      for (const _item of Maybe.None) {
        index++;
      }
      expect(index).toBe(0);
    });
  });

  describe("with NotFound", () => {
    test("factory notFound and unwrap", () => {
      const uut = Maybe.notFound("one", "two");
      expect(isMaybe(uut)).toBeTruthy();
      expect(uut.isNone).toBe(true);
      expect(() => uut.unwrap()).toThrow(
        new NotFoundError("NotFound: one two"),
      );
    });
  });

  describe("with Some value", () => {
    const content = { id: "utest", count: 2 };
    const uut = Maybe.withValue(content);

    test("prevents nesting constructor", () => {
      expect(Maybe.withValue(Maybe.withValue(uut))).toEqual(uut);
    });

    test("has identifying properties", () => {
      expect(uut.isNone).toBe(false);
      expect(uut.isValue).toBe(true);
    });

    test("is identified with type guard", () => {
      expect(Maybe.isMaybe(uut)).toBeTruthy();
      expect(Maybe.isMaybe({ isValue: true })).toBeFalsy();
    });

    test("can be unwrapped", () => {
      expect(uut.unwrap()).toBe(content);
      expect(uut.unwrapOr("hello")).toBe(content);
      expect(uut.unwrapOrElse(() => false)).toBe(content);
      expect(uut.unwrapOrThrow()).toBe(content);
      expect(uut.unwrapOrThrow("Boom")).toBe(content);
      expect(uut.unwrapOrNull()).toBe(content);
    });

    test("can be asserted", () => {
      expect(uut.assertIsValue()).toEqual(content);
      expect(() => uut.assertIsNone()).toThrow(/^Expected None, have Value/);
      expect(() => uut.assertIsNone("Found")).toThrow("Found");
    });

    test("can be combined with another Maybe", () => {
      const other = Maybe.withValue(2);

      expect(uut.or(Maybe.None)).toBe(uut);
      expect(uut.or(other)).toBe(uut);
      expect(uut.orElse(() => other)).toBe(uut);

      expect(uut.and(Maybe.None)).toBe(Maybe.None);
      expect(uut.and(other)).toBe(other);
      expect(uut.andThen(() => Maybe.None)).toBe(Maybe.None);
      expect(uut.andThen(() => other)).toBe(other);
    });

    test("can be transformed", () => {
      expect(uut.map((value) => value.count + 1)).toEqual(Maybe.withValue(3));
      expect(uut.mapOr((value) => value.id, "orThis")).toEqual(
        Maybe.withValue(content.id),
      );
      expect(
        uut.mapOrElse(
          (value) => ({ ...value, count: 5 }),
          () => null,
        ),
      ).toEqual(Maybe.withValue({ id: content.id, count: 5 }));

      expect(uut.filter((_value) => true)).toBe(uut);
      expect(uut.filter((_value) => false)).toBe(Maybe.None);

      expect(uut.toResult(new Error("mine"))).toEqual(Result.okay(content));
    });

    test("can be stringified", () => {
      expect(uut.toString()).toEqual('Value({"id":"utest","count":2})');
    });

    test("iterator on values", () => {
      let index = 0;
      for (const value of Maybe.withValue([1, 2])) {
        index++;
        expect(value).toBe(index);
      }
      expect(index).toBe(2);
    });

    test("iterator on Empty", () => {
      let index = 0;
      for (const _value of Maybe.Empty) {
        index++;
      }
      expect(index).toBe(0);
    });
  });

  describe("Maybe.wrap", () => {
    test("with values", () => {
      const num = Maybe.wrap(3);
      expect(num.isValue).toBe(true);
      expect(num.unwrap()).toBe(3);

      const content = { hello: "world" };
      const ob = Maybe.wrap(content);
      expect(ob.isValue).toBe(true);
      expect(ob.unwrap()).toBe(content);
    });

    test("with not-values", () => {
      expect(Maybe.wrap(null)).toBe(Maybe.None);
      expect(Maybe.wrap(undefined)).toBe(Maybe.None);
    });
  });

  describe("allOrNone", () => {
    test("with a None", () => {
      const maybe = Maybe.allOrNone(
        Maybe.Empty,
        Maybe.withValue(3),
        Maybe.None,
      );
      expect(maybe).toBe(Maybe.None);
    });

    test("with only values", () => {
      const maybe = Maybe.allOrNone(Maybe.Empty, Maybe.withValue(3));
      expect(maybe.unwrap()).toEqual([undefined, 3]);
    });
  });

  describe("allValues", () => {
    test("with a None", () => {
      const maybe = Maybe.allValues(
        Maybe.withValue(1),
        Maybe.None,
        Maybe.withValue(3),
      );
      expect(maybe).toEqual([1, 3]);
    });

    test("with only values", () => {
      const maybe = Maybe.allValues(Maybe.withValue(1), Maybe.withValue(3));
      expect(maybe).toEqual([1, 3]);
    });
  });

  describe("any", () => {
    test("with only None", () => {
      const maybe = Maybe.any(Maybe.asNone(), Maybe.None);
      expect(maybe).toBe(Maybe.None);
    });

    test("with values", () => {
      const maybe = Maybe.any(Maybe.withValue(3), Maybe.None, Maybe.empty());
      expect(maybe.unwrap()).toEqual(3);
    });
  });

  test("unwrap", () => {
    expect(Maybe.unwrap(Maybe.withValue(3))).toBe(3);
    expect(() => Maybe.unwrap(Maybe.None)).toThrow();
  });

  test("unwrapOrNull", () => {
    expect(Maybe.unwrapOrNull(Maybe.withValue(3))).toBe(3);
    expect(Maybe.unwrapOrNull(Maybe.None)).toBeNull();
  });
});
