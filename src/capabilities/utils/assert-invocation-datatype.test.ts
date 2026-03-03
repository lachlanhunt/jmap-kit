import { describe, expect, it } from "vitest";
import { Example } from "../example/example.js";
import { assertInvocationDataType } from "./assert-invocation-datatype.js";

describe("assertInvocationDataType", () => {
    it("should not throw for valid dataType", () => {
        const exampleInvocation = Example.request.get({
            accountId: "test-account",
        });

        expect(() => assertInvocationDataType(exampleInvocation, "Example")).not.toThrow();
    });

    it("should throw TypeError when the value is not an instance of Invocation", () => {
        // @ts-expect-error - purposely passing an invalid object
        expect(() => assertInvocationDataType({}, "Email")).toThrow(TypeError);
        // @ts-expect-error - purposely passing an invalid object
        expect(() => assertInvocationDataType({}, "Email")).toThrow("Invocation is required for Email requests");
    });

    it("should throw for invalid dataType", () => {
        const exampleInvocation = Example.request.get({
            accountId: "test-account",
        });

        expect(() => assertInvocationDataType(exampleInvocation, "Email")).toThrow(
            "Expected invocation dataType to be 'Email', but got 'Example'",
        );
    });
});
