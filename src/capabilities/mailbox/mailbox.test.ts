import { EMAIL_CAPABILITY_URI } from "../../common/registry.js";
import { Mailbox, MailboxInvocation } from "./mailbox.js";

describe("MailboxInvocation class", () => {
    it("should expose the core capability URI", () => {
        const test = new MailboxInvocation("test", {
            accountId: "example",
        });

        expect(test.uri).toBe(EMAIL_CAPABILITY_URI);
    });
});

describe("Mailbox object", () => {
    it("should create the Mailbox/get method", () => {
        const test = Mailbox.request.get({
            accountId: "example",
        });

        expect(test.name).toBe("Mailbox/get");
    });

    it("should expose the Mailbox URI on MailboxInvocation instances", () => {
        const test = Mailbox.request.get({
            accountId: "example",
        });

        expect(test.uri).toBe(EMAIL_CAPABILITY_URI);
    });

    it("should create the Mailbox/get method with the expected arguments", () => {
        const test = Mailbox.request.get({
            accountId: "example",
            ids: ["1", "2", "3"],
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("ids")).toBe(true);
        expect(test.hasArgument("properties")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("ids")).toHaveLength(3);
    });

    it("should create the Mailbox/changes method with the expected arguments", () => {
        const test = Mailbox.request.changes({
            accountId: "example",
            sinceState: "state123",
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("sinceState")).toBe(true);
        expect(test.hasArgument("maxChanges")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("sinceState")).toBe("state123");
    });

    it("should create the Mailbox/query method with the expected arguments", () => {
        const test = Mailbox.request.query({
            accountId: "example",
            anchor: "test",
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("anchor")).toBe(true);
        expect(test.hasArgument("calculateTotal")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("anchor")).toBe("test");
    });

    it("should create the Mailbox/queryChanges method with the expected arguments", () => {
        const test = Mailbox.request.queryChanges({
            accountId: "example",
            sinceQueryState: "state123",
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("sinceQueryState")).toBe(true);
        expect(test.hasArgument("calculateTotal")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("sinceQueryState")).toBe("state123");
    });

    it("should create the Mailbox/set method with the expected arguments", () => {
        const test = Mailbox.request.set({
            accountId: "example",
            onDestroyRemoveEmails: true,
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("onDestroyRemoveEmails")).toBe(true);
        expect(test.hasArgument("ifInState")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("onDestroyRemoveEmails")).toBe(true);
    });
});
