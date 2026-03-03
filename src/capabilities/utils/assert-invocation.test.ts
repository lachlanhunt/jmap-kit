import { assert, describe, expect, it } from "vitest";
import { Example } from "../example/example.js";
import { assertInvocation } from "./assert-invocation.js";

describe("assertInvocation", () => {
    it("should not throw for valid dataType and method", () => {
        const getInvocation = Example.request.get({
            accountId: "test-account",
        });

        expect(() => assertInvocation(getInvocation, "Example", "get")).not.toThrow();
    });

    it("should throw TypeError when the value is not an instance of Invocation", () => {
        // @ts-expect-error - purposely passing an invalid object
        expect(() => assertInvocation({}, "Example", "get")).toThrow(TypeError);
        // @ts-expect-error - purposely passing an invalid object
        expect(() => assertInvocation({}, "Example", "get")).toThrow("Invocation is required for Example requests");
    });

    it("should throw for invalid dataType", () => {
        const getInvocation = Example.request.get({
            accountId: "test-account",
        });

        expect(() => assertInvocation(getInvocation, "Email", "get")).toThrow(
            'Expected invocation to be "Email/get", but got "Example/get"',
        );
    });

    it("should throw for invalid method", () => {
        const getInvocation = Example.request.get({
            accountId: "test-account",
        });

        expect(() => assertInvocation(getInvocation, "Example", "set")).toThrow(
            'Expected invocation to be "Example/set", but got "Example/get"',
        );
    });

    it("should include the original error as cause", () => {
        const getInvocation = Example.request.get({
            accountId: "test-account",
        });

        try {
            assertInvocation(getInvocation, "Email", "get");
            // Should not reach this point
            /* istanbul ignore next */
            assert.fail("Expected an error to be thrown");
        } catch (error) {
            if (error instanceof Error) {
                expect(error.message).toContain('Expected invocation to be "Email/get", but got "Example/get"');
                expect(error.cause).toBeDefined();
                expect((error.cause as Error).message).toContain("Expected invocation dataType to be 'Email'");
            } else {
                throw new Error("Expected error to be an instance of Error");
            }
        }
    });
});
