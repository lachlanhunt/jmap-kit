import { SUBMISSION_CAPABILITY_URI } from "../../common/registry.js";
import { Identity, IdentityInvocation } from "./identity.js";

describe("IdentityInvocation class", () => {
    it("should expose the submission capability URI", () => {
        const test = new IdentityInvocation("test", {
            accountId: "example",
        });

        expect(test.uri).toBe(SUBMISSION_CAPABILITY_URI);
    });
});

describe("Identity object", () => {
    it("should create the Identity/get method", () => {
        const test = Identity.request.get({
            accountId: "example",
        });

        expect(test.name).toBe("Identity/get");
    });

    it("should expose the submission capability URI on IdentityInvocation instances", () => {
        const test = Identity.request.get({
            accountId: "example",
        });

        expect(test.uri).toBe(SUBMISSION_CAPABILITY_URI);
    });

    it("should create the Identity/get method with the expected arguments", () => {
        const test = Identity.request.get({
            accountId: "example",
            ids: ["1", "2", "3"],
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("ids")).toBe(true);
        expect(test.hasArgument("properties")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("ids")).toHaveLength(3);
    });

    it("should create the Identity/changes method with the expected arguments", () => {
        const test = Identity.request.changes({
            accountId: "example",
            sinceState: "state123",
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("sinceState")).toBe(true);
        expect(test.hasArgument("maxChanges")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("sinceState")).toBe("state123");
    });

    it("should create the Identity/set method with the expected arguments", () => {
        const test = Identity.request.set({
            accountId: "example",
            create: {
                k1: {
                    email: "user@example.com",
                    name: "Test User",
                },
            },
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("create")).toBe(true);
        expect(test.hasArgument("ifInState")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
    });
});
