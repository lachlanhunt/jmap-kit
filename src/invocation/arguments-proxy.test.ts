import { describe, expect, it } from "vitest";
import type { JMAPCapability, JSONValue } from "../common/types.js";
import { createArgumentsProxy } from "./arguments-proxy.js";
import { Invocation } from "./invocation.js";

type TestArgs = {
    a?: JSONValue;
    b?: JSONValue;
};

class TestInvocation extends Invocation<TestArgs> {
    get uri(): JMAPCapability {
        return "urn:test";
    }
}

function createProxy(args: TestArgs = {}) {
    const inv = new TestInvocation("Test", "echo", args);
    return { inv, proxy: createArgumentsProxy<TestArgs>(inv) };
}

describe("createArgumentsProxy", () => {
    it("should return values via property access", () => {
        const { proxy } = createProxy({ a: "hello" });
        expect(proxy.a).toBe("hello");
    });

    it("should return undefined for missing keys", () => {
        const { proxy } = createProxy();
        expect(proxy.a).toBeUndefined();
    });

    it("should support the 'in' operator for present keys", () => {
        const { proxy } = createProxy({ a: 1 });
        expect("a" in proxy).toBe(true);
    });

    it("should support the 'in' operator for absent keys", () => {
        const { proxy } = createProxy();
        expect("a" in proxy).toBe(false);
    });

    it("should return own keys via Object.keys()", () => {
        const { proxy } = createProxy({ a: 1, b: 2 });
        expect(Object.keys(proxy)).toEqual(["a", "b"]);
    });

    it("should return an empty array from Object.keys() when there are no arguments", () => {
        const { proxy } = createProxy();
        expect(Object.keys(proxy)).toEqual([]);
    });

    it("should support spread into a plain object", () => {
        const { proxy } = createProxy({ a: 1, b: 2 });
        expect({ ...proxy }).toEqual({ a: 1, b: 2 });
    });

    it("should serialise correctly with JSON.stringify()", () => {
        const { proxy } = createProxy({ a: "test", b: 42 });
        expect(JSON.stringify(proxy)).toBe('{"a":"test","b":42}');
    });

    it("should work with toEqual()", () => {
        const { proxy } = createProxy({ a: 1 });
        expect(proxy).toEqual({ a: 1 });
    });

    it("should work with toMatchObject()", () => {
        const { proxy } = createProxy({ a: 1, b: 2 });
        expect(proxy).toMatchObject({ a: 1 });
    });

    it("should delegate property assignment to setArgument()", () => {
        const { inv, proxy } = createProxy({ a: 1 });
        proxy.a = 99;
        expect(inv.getArgument("a")).toBe(99);
    });

    it("should delegate property deletion to deleteArgument()", () => {
        const { inv, proxy } = createProxy({ a: 1 });
        delete proxy.a;
        expect(inv.hasArgument("a")).toBe(false);
    });

    it("should reflect changes from setArgument() on the host", () => {
        const { inv, proxy } = createProxy({ a: 1 });
        inv.setArgument("a", 99);
        expect(proxy.a).toBe(99);
    });

    it("should reflect changes from deleteArgument() on the host", () => {
        const { inv, proxy } = createProxy({ a: 1 });
        inv.deleteArgument("a");
        expect(proxy.a).toBeUndefined();
        expect("a" in proxy).toBe(false);
    });

    it("should reflect newly added arguments on the host", () => {
        const { inv, proxy } = createProxy();
        expect("a" in proxy).toBe(false);
        inv.setArgument("a", 42);
        expect(proxy.a).toBe(42);
        expect("a" in proxy).toBe(true);
        expect(Object.keys(proxy)).toEqual(["a"]);
    });

    it("should return a property descriptor with writable true for present keys", () => {
        const { proxy } = createProxy({ a: "v" });
        const desc = Object.getOwnPropertyDescriptor(proxy, "a");
        expect(desc).toEqual({ configurable: true, enumerable: true, writable: true, value: "v" });
    });

    it("should return undefined property descriptor for absent keys", () => {
        const { proxy } = createProxy();
        expect(Object.getOwnPropertyDescriptor(proxy, "a")).toBeUndefined();
    });
});
