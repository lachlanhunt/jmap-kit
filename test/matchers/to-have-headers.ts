import { expect } from "vitest";

expect.extend({
    /**
     * Custom matcher to check if Headers object contains expected header values
     */
    toHaveHeaders(received: unknown, expected) {
        if (typeof received !== "object" || received === null) {
            return {
                pass: false,
                message: () => `Expected Headers, but received ${typeof received}`,
            };
        }

        if (!(received instanceof Headers)) {
            return {
                pass: false,
                message: () => `Expected Headers, but received ${received.constructor.name}`,
            };
        }

        const expectedHeaderNames = Object.keys(expected);
        const actual = Object.fromEntries(
            Array.from(received.entries()).filter(([key]) => expectedHeaderNames.includes(key)),
        );

        // this.equals()
        const pass = this.isNot
            ? expectedHeaderNames.some((key) => received.has(key) && this.equals(received.get(key), expected[key]))
            : expectedHeaderNames.every((key) => received.has(key) && this.equals(received.get(key), expected[key]));

        return {
            pass,
            message: () =>
                `Expected Headers to ${pass ? "not " : ""}have headers:\n` +
                `  Expected: ${JSON.stringify(expected, null, 2)}\n` +
                `  Received: ${JSON.stringify(actual, null, 2)}`,
            actual,
            expected,
        };
    },
});
