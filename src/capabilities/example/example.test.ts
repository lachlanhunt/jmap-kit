import { Example, ExampleInvocation } from "./example.js";

describe("ExampleInvocation class", () => {
    it("should expose the exaExample capability URI", () => {
        const test = new ExampleInvocation("test", {});

        expect(test.uri).toBe("urn:example");
    });
});

describe("Example object", () => {
    it("should create the Example/echo method", () => {
        const test = Example.request.echo({});

        expect(test.name).toBe("Example/echo");
    });

    it("should expose the Example URI on ExampleInvocation instances", () => {
        const test = Example.request.echo({});

        expect(test.uri).toBe("urn:example");
    });

    it("should create the Example/echo method with the expected arguments", () => {
        const test = Example.request.echo({
            name: "example",
            values: [1, 2, 3],
            test: true,
        });

        expect(test.hasArgument("name")).toBe(true);
        expect(test.hasArgument("values")).toBe(true);
        expect(test.hasArgument("test")).toBe(true);

        expect(test.getArgument("name")).toBe("example");
        expect(test.getArgument("values")).toHaveLength(3);
        expect(test.getArgument("test")).toBe(true);
    });
});
