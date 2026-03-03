import { describe, expect, it } from "vitest";
import { Example } from "../example/example.js";
import { assertInvocationMethod } from "./assert-invocation-method.js";

describe("assertInvocationMethod", () => {
    it("should not throw for valid method", () => {
        // Use the Example invocation class for real-world testing
        const getInvocation = Example.request.get({
            accountId: "test-account",
        });

        expect(() => assertInvocationMethod(getInvocation, "get")).not.toThrow();
    });

    it("should throw TypeError when the value is not an instance of Invocation", () => {
        // @ts-expect-error - purposely passing an invalid object
        expect(() => assertInvocationMethod({}, "get")).toThrow(TypeError);
        // @ts-expect-error - purposely passing an invalid object
        expect(() => assertInvocationMethod({}, "get")).toThrow("Invocation is required for get requests");
    });

    it("should throw for invalid method", () => {
        const getInvocation = Example.request.get({
            accountId: "test-account",
        });

        expect(() => assertInvocationMethod(getInvocation, "set")).toThrow(
            "Expected invocation method to be 'set', but got 'get'",
        );
    });
});
