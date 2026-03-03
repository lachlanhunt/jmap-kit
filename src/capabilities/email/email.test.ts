import { EMAIL_CAPABILITY_URI } from "../../common/registry.js";
import { Email, EmailInvocation } from "./email.js";

describe("EmailInvocation class", () => {
    it("should expose the core capability URI", () => {
        const test = new EmailInvocation("test", {
            accountId: "example",
        });

        expect(test.uri).toBe(EMAIL_CAPABILITY_URI);
    });
});

describe("Email object", () => {
    it("should create the Email/get method", () => {
        const test = Email.request.get({
            accountId: "example",
        });

        expect(test.name).toBe("Email/get");
    });

    it("should expose the Email URI on EmailInvocation instances", () => {
        const test = Email.request.get({
            accountId: "example",
        });

        expect(test.uri).toBe(EMAIL_CAPABILITY_URI);
    });

    it("should create the Email/get method with the expected arguments", () => {
        const test = Email.request.get({
            accountId: "example",
            ids: ["1", "2", "3"],
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("ids")).toBe(true);
        expect(test.hasArgument("properties")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("ids")).toHaveLength(3);
    });

    it("should create the Email/changes method with the expected arguments", () => {
        const test = Email.request.changes({
            accountId: "example",
            sinceState: "state123",
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("sinceState")).toBe(true);
        expect(test.hasArgument("maxChanges")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("sinceState")).toBe("state123");
    });

    it("should create the Email/query method with the expected arguments", () => {
        const test = Email.request.query({
            accountId: "example",
            anchor: "test",
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("anchor")).toBe(true);
        expect(test.hasArgument("calculateTotal")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("anchor")).toBe("test");
    });

    it("should create the Email/queryChanges method with the expected arguments", () => {
        const test = Email.request.queryChanges({
            accountId: "example",
            sinceQueryState: "state123",
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("sinceQueryState")).toBe(true);
        expect(test.hasArgument("calculateTotal")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("sinceQueryState")).toBe("state123");
    });

    it("should create the Email/copy method with the expected arguments", () => {
        const test = Email.request.copy({
            accountId: "example",
            fromAccountId: "example1",
            create: {
                "test-id": {
                    id: "x",
                },
            },
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("create")).toBe(true);
        expect(test.hasArgument("destroyFromIfInState")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("fromAccountId")).toBe("example1");
    });

    it("should create the Email/set method with the expected arguments", () => {
        const test = Email.request.set({
            accountId: "example",
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("ifInState")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
    });
});
