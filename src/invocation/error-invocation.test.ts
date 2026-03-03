import { describe, expect, it } from "vitest";
import { ErrorInvocation } from "./error-invocation.js";

describe("ErrorInvocation", () => {
    it("should set and return the correct name", () => {
        const err = new ErrorInvocation({ type: "serverFail" });
        expect(err.name).toBe("error");
    });

    it("should store and return the correct id", () => {
        const sym = Symbol("err");
        const err = new ErrorInvocation({ type: "invalidArguments" }, sym);
        expect(err.id).toBe(sym);
    });

    it("should generate a symbol if none is provided", () => {
        const err = new ErrorInvocation({ type: "unknownMethod" });
        expect(typeof err.id).toBe("symbol");
    });

    it("should return the arguments as a plain object", () => {
        const args = { type: "forbidden", description: "no access", foo: 42 };
        const err = new ErrorInvocation(args);
        expect(err.arguments).toEqual(args);
    });

    it("should return the correct type", () => {
        const err = new ErrorInvocation({ type: "accountNotFound" });
        expect(err.type).toBe("accountNotFound");
    });

    it("should handle extra properties in arguments", () => {
        const args = { type: "customType", extra: "value" };
        const err = new ErrorInvocation(args);
        expect(err.arguments).toEqual(args);
        expect(err.type).toBe("customType");
    });
});
