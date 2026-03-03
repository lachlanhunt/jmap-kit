import { describe, expect, it } from "vitest";
import { assertNonNullish } from "./assert-non-nullish.js";

describe("assertNonNullish", () => {
    it("should not throw for non-nullish values", () => {
        // String
        expect(() => assertNonNullish("test", "string value")).not.toThrow();

        // Number
        expect(() => assertNonNullish(0, "zero")).not.toThrow();
        expect(() => assertNonNullish(42, "positive number")).not.toThrow();
        expect(() => assertNonNullish(-42, "negative number")).not.toThrow();

        // Boolean
        expect(() => assertNonNullish(false, "false boolean")).not.toThrow();
        expect(() => assertNonNullish(true, "true boolean")).not.toThrow();

        // Empty array and object
        expect(() => assertNonNullish([], "empty array")).not.toThrow();
        expect(() => assertNonNullish({}, "empty object")).not.toThrow();
    });

    it("should throw for null", () => {
        const label = "test label";
        expect(() => assertNonNullish(null, label)).toThrow(`${label} is null or undefined`);
    });

    it("should throw for undefined", () => {
        const label = "test label";
        expect(() => assertNonNullish(undefined, label)).toThrow(`${label} is null or undefined`);
    });

    it("should provide type narrowing", () => {
        // TypeScript compile-time test
        function testTypeNarrowing(value: string | null | undefined) {
            assertNonNullish(value, "value");
            // After assertion, value should be treated as string only (non-nullable)
            const length: number = value.length; // This would cause a TS error if type narrowing doesn't work
            expect(typeof length).toBe("number");
        }

        expect(() => testTypeNarrowing("hello")).not.toThrow();

        expect(() => testTypeNarrowing(null)).toThrow("value is null or undefined");
        expect(() => testTypeNarrowing(undefined)).toThrow("value is null or undefined");
    });
});
