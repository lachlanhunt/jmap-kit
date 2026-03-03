import { CORE_CAPABILITY_URI } from "../../common/registry.js";
import { Core, CoreInvocation } from "./core.js";

describe("CoreInvocation class", () => {
    it("should expose the core capability URI", () => {
        const test = new CoreInvocation("test", {});

        expect(test.uri).toBe(CORE_CAPABILITY_URI);
    });
});

describe("Core object", () => {
    it("should create the Core/echo method", () => {
        const test = Core.request.echo({});

        expect(test.name).toBe("Core/echo");
    });

    it("should expose the Core URI on CoreInvocation instances", () => {
        const test = Core.request.echo({});

        expect(test.uri).toBe(CORE_CAPABILITY_URI);
    });

    it("should create the Core/echo method with the expected arguments", () => {
        const test = Core.request.echo({
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
