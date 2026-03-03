import { EMAIL_CAPABILITY_URI } from "../../common/registry.js";
import { Thread, ThreadInvocation } from "./thread.js";

describe("ThreadInvocation class", () => {
    it("should expose the core capability URI", () => {
        const test = new ThreadInvocation("test", {
            accountId: "example",
        });

        expect(test.uri).toBe(EMAIL_CAPABILITY_URI);
    });
});

describe("Thread object", () => {
    it("should create the Thread/get method", () => {
        const test = Thread.request.get({
            accountId: "example",
        });

        expect(test.name).toBe("Thread/get");
    });

    it("should expose the Thread URI on ThreadInvocation instances", () => {
        const test = Thread.request.get({
            accountId: "example",
        });

        expect(test.uri).toBe(EMAIL_CAPABILITY_URI);
    });

    it("should create the Thread/get method with the expected arguments", () => {
        const test = Thread.request.get({
            accountId: "example",
            ids: ["1", "2", "3"],
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("ids")).toBe(true);
        expect(test.hasArgument("properties")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("ids")).toHaveLength(3);
    });

    it("should create the Thread/changes method with the expected arguments", () => {
        const test = Thread.request.changes({
            accountId: "example",
            sinceState: "state123",
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("sinceState")).toBe(true);
        expect(test.hasArgument("maxChanges")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("sinceState")).toBe("state123");
    });
});
