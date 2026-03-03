import { deepFreeze } from "./deep-freeze.js";

describe("deepFreeze", () => {
    it("should freeze an object", () => {
        const obj = {
            a: 1,
            b: {
                c: [1, 2, 3],
            },
        };
        expect(Object.isFrozen(obj)).toBe(false);
        deepFreeze(obj);
        expect(Object.isFrozen(obj)).toBe(true);
        expect(Object.isFrozen(obj.b)).toBe(true);
        expect(Object.isFrozen(obj.b.c)).toBe(true);
    });
});
