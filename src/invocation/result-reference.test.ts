import { isWritable } from "../common/test-utils.js";
import type { JMAPResultReference, JSONValue } from "../common/types.js";
import { ResultReference } from "./result-reference.js";

describe("ResultReference class", () => {
    it("should expose the name property as read only", () => {
        const test = new ResultReference(Symbol(), "Core/echo", "/id");

        expect(isWritable(test, "name")).toBe(false);
        expect(test.name).toBe("Core/echo");
    });

    it("should expose the path property as read only", () => {
        const test = new ResultReference(Symbol(), "Core/echo", "/example/id");

        expect(isWritable(test, "path")).toBe(false);
        expect(test.path).toBe("/example/id");
    });

    it("should stringify as JSON correctly", () => {
        const mockId = Symbol("mock-id");
        const idMap = new Map([[mockId, "example-id"]]);

        const test = new ResultReference(mockId, "Core/echo", "/example/id");

        const str = JSON.stringify(test, (_, value: JSONValue | symbol) => {
            if (typeof value === "symbol") {
                return idMap.get(value) ?? "FAIL";
            }
            return value;
        });

        const { resultOf, name, path } = JSON.parse(str) as JMAPResultReference;

        expect(resultOf).toBe(idMap.get(mockId));
        expect(name).toBe("Core/echo");
        expect(path).toBe("/example/id");
    });

    it("should resolve correctly", () => {
        const mockId = Symbol("mock-id");
        const idMap = new Map([[mockId, "example-id"]]);

        const test = new ResultReference(mockId, "Core/echo", "/example/id");

        const result = test.resolve((id) => idMap.get(id));

        expect(result).toEqual({
            resultOf: "example-id",
            name: "Core/echo",
            path: "/example/id",
        });
    });

    it("should throw if the id cannot be resolved", () => {
        const mockId = Symbol("mock-id");

        const test = new ResultReference(mockId, "Core/echo", "/example/id");

        expect(() => {
            test.resolve(() => undefined);
        }).toThrowError(`Failed to resolve id for reference {"name":"Core/echo","path":"/example/id"}`);
    });
});
