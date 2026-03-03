import { describe, expect, it } from "vitest";
import { MASKED_EMAIL_CAPABILITY_URI } from "../../common/registry.js";
import { MaskedEmail, MaskedEmailInvocation } from "./maskedemail.js";

describe("MaskedEmailInvocation class", () => {
    it("should expose the MaskedEmail capability URI", () => {
        const test = new MaskedEmailInvocation("test", {
            accountId: "example",
        });
        expect(test.uri).toBe(MASKED_EMAIL_CAPABILITY_URI);
    });
});

describe("MaskedEmail object", () => {
    it("should create the MaskedEmail/get method", () => {
        const test = MaskedEmail.request.get({
            accountId: "example",
        });
        expect(test.name).toBe("MaskedEmail/get");
    });

    it("should expose the MaskedEmail URI on MaskedEmailInvocation instances", () => {
        const test = MaskedEmail.request.get({
            accountId: "example",
        });
        expect(test.uri).toBe(MASKED_EMAIL_CAPABILITY_URI);
    });

    it("should create the MaskedEmail/get method with the expected arguments", () => {
        const test = MaskedEmail.request.get({
            accountId: "example",
            ids: ["1", "2", "3"],
        });
        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("ids")).toBe(true);
        expect(test.hasArgument("properties")).toBe(false);
        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("ids")).toHaveLength(3);
    });

    it("should create the MaskedEmail/set method with the expected arguments", () => {
        const test = MaskedEmail.request.set({
            accountId: "example",
            create: {
                c1: { forDomain: "https://example.com", description: "desc" },
            },
        });
        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("create")).toBe(true);
        expect(test.hasArgument("update")).toBe(false);
        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("create")).toHaveProperty("c1");
    });
});
