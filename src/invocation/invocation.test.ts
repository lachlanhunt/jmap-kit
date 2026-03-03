import { isWritable } from "../common/test-utils.js";
import type { JMAPCapability, JMAPRequestInvocation, JSONValue } from "../common/types.js";
import { idGenerator } from "../common/utils.js";
import { Invocation } from "./invocation.js";

describe("Invocation class", () => {
    type ExampleInvocationArgs = {
        example?: JSONValue;
        ref?: JSONValue;
    };

    class ExampleInvocation<T extends ExampleInvocationArgs> extends Invocation<T> {
        get uri(): JMAPCapability {
            return "urn:example";
        }
    }

    it("should expose the name property as read only", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {});

        expect(isWritable(test, "name")).toBe(false);
        expect(testInvocation.name).toBe("Core/echo");
    });

    it("should expose the dataType property as read only", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {});

        expect(isWritable(testInvocation, "dataType")).toBe(false);
        expect(testInvocation.dataType).toBe("Core");
    });

    it("should expose the id property as read only", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {});

        expect(isWritable(testInvocation, "id")).toBe(false);
        expect(typeof testInvocation.id).toBe("symbol");
    });

    it("should expose the arguments property as read only", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {});

        expect(isWritable(testInvocation, "arguments")).toBe(false);
        expect(testInvocation.arguments).toMatchObject({});
    });

    it("should expose the uri property as read only", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {});

        expect(isWritable(testInvocation, "uri")).toBe(false);
        expect(testInvocation.uri).toBe("urn:example");
    });

    it("should have the given arguments", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
            example: "PASS",
        });

        expect(testInvocation.hasArgument("example")).toBe(true);
        expect(testInvocation.getArgument("example")).toBe("PASS");
    });

    it("should allow setting new arguments", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {});

        expect(testInvocation.hasArgument("example")).toBe(false);

        testInvocation.setArgument("example", "PASS");

        expect(testInvocation.hasArgument("example")).toBe(true);
        expect(testInvocation.getArgument("example")).toBe("PASS");
    });

    it("should allow deleting arguments", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
            example: "PASS",
        });

        expect(testInvocation.hasArgument("example")).toBe(true);

        testInvocation.deleteArgument("example");

        expect(testInvocation.hasArgument("example")).toBe(false);
        expect(testInvocation.getArgument("example")).toBe(undefined);
    });

    it("should stringify as JSON correctly", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
            example: "PASS",
        });

        const generateId = idGenerator();
        const idMap = new Map<symbol, string>();

        const str = JSON.stringify(testInvocation, (key, value: JSONValue | symbol) => {
            if (key === "2" && typeof value === "symbol") {
                const newId = generateId.next().value;
                idMap.set(value, newId);
                return idMap.get(value);
            }
            return value;
        });

        const [name, args, id] = JSON.parse(str) as JMAPRequestInvocation;
        const expectedId = idMap.values().next();

        expect(name).toBe(testInvocation.name);

        expect(args).toMatchObject({
            example: "PASS",
        });

        expect(expectedId.done).not.toBe(true);
        expect(id).toBe(expectedId.value);
    });

    it("should create a ResultReference", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
            example: "PASS",
        });

        const reference = testInvocation.createReference("/id");

        expect(reference.name).toBe(testInvocation.name);
        expect(reference.path).toBe("/id");
    });

    it("should create a ResultReference with matching id", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {});
        const ref = testInvocation.createReference("/id");

        const testInvocation2 = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
            ref,
        });

        let invocationId: symbol | undefined;
        let referenceId: symbol | undefined;

        JSON.stringify(testInvocation2, (_, value: JSONValue | symbol) => {
            if (invocationId === undefined && typeof value === "symbol") {
                invocationId = value;
                return "id-0";
            }
            return value;
        });

        JSON.stringify(ref, (_, value: JSONValue | symbol) => {
            if (referenceId === undefined && typeof value === "symbol") {
                referenceId = value;
                return "id-0";
            }
            return value;
        });

        expect(referenceId).not.toBe(undefined);
        expect(referenceId).toBe(invocationId);
    });

    it("should allow constructing with reference arguments", () => {
        const testInvocation1 = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
            example: 1,
        });
        expect(
            () =>
                new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
                    ref: testInvocation1.createReference("/path"),
                }),
        ).not.toThrow();
    });

    it("should allow setting reference arguments", () => {
        const testInvocation1 = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
            example: 1,
        });

        const testInvocation2 = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {});

        expect(() => {
            testInvocation2.setArgument("ref", testInvocation1.createReference("/path"));
        }).not.toThrow();
    });

    it("should throw an error when setting a reference argument with a self referencing ResultReference", () => {
        const testInvocation = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {});

        expect(() => {
            testInvocation.setArgument("ref", testInvocation.createReference("/path"));
        }).toThrow();
    });

    it("should resolve result reference properties correctly", () => {
        const testInvocation1 = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
            example: 1,
        });

        const idMap = new Map([[testInvocation1.id, "id_0"]]);

        const testInvocation2 = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
            example: 2,
            ref: testInvocation1.createReference("/path"),
        });

        const resolved = testInvocation2.resolve("id_1", (id) => idMap.get(id));

        expect(resolved[1]).toEqual({
            example: 2,
            "#ref": {
                name: "Core/echo",
                path: "/path",
                resultOf: "id_0",
            },
        });
    });

    describe("arguments proxy", () => {
        it("should return the same object reference on repeated access", () => {
            const inv = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", { example: "PASS" });
            expect(inv.arguments).toBe(inv.arguments);
        });

        it("should support property access", () => {
            const inv = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", { example: "PASS" });
            expect(inv.arguments.example).toBe("PASS");
        });

        it("should support Object.keys()", () => {
            const inv = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", { example: "PASS", ref: "val" });
            expect(Object.keys(inv.arguments)).toEqual(["example", "ref"]);
        });

        it("should support spread", () => {
            const inv = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", { example: "PASS" });
            expect({ ...inv.arguments }).toEqual({ example: "PASS" });
        });

        it("should support JSON.stringify()", () => {
            const inv = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", { example: "PASS" });
            expect(JSON.stringify(inv.arguments)).toBe('{"example":"PASS"}');
        });

        it("should support the 'in' operator", () => {
            const inv = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", { example: "PASS" });
            expect("example" in inv.arguments).toBe(true);
            expect("ref" in inv.arguments).toBe(false);
        });

        it("should delegate property assignment to setArgument()", () => {
            const inv = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", { example: "BEFORE" });
            (inv.arguments as Record<string, unknown>)["example"] = "AFTER";
            expect(inv.getArgument("example")).toBe("AFTER");
        });

        it("should delegate property deletion to deleteArgument()", () => {
            const inv = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", { example: "PASS" });
            delete (inv.arguments as Record<string, unknown>)["example"];
            expect(inv.hasArgument("example")).toBe(false);
        });

        it("should reflect changes after setArgument()", () => {
            const inv = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", { example: "BEFORE" });
            const args = inv.arguments;
            inv.setArgument("example", "AFTER");
            expect(args.example).toBe("AFTER");
        });

        it("should reflect changes after deleteArgument()", () => {
            const inv = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", { example: "PASS" });
            const args = inv.arguments;
            inv.deleteArgument("example");
            expect(args.example).toBeUndefined();
            expect("example" in args).toBe(false);
        });
    });

    it("should throw an error when resolving a reference with an unknown id", () => {
        const testInvocation1 = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
            example: 1,
        });

        const testInvocation2 = new ExampleInvocation<ExampleInvocationArgs>("Core", "echo", {
            example: 2,
            ref: testInvocation1.createReference("/path"),
        });

        expect(() => testInvocation2.resolve("id_1", () => undefined)).toThrowError(
            `Failed to resolve id for reference {"name":"Core/echo","path":"/path"}`,
        );
    });
});
