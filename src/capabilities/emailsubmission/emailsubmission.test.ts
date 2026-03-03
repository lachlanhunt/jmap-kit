import { SUBMISSION_CAPABILITY_URI } from "../../common/registry.js";
import { EmailSubmission, EmailSubmissionInvocation } from "./emailsubmission.js";

describe("EmailSubmissionInvocation class", () => {
    it("should expose the submission capability URI", () => {
        const test = new EmailSubmissionInvocation("test", {
            accountId: "example",
        });

        expect(test.uri).toBe(SUBMISSION_CAPABILITY_URI);
    });
});

describe("EmailSubmission object", () => {
    it("should create the EmailSubmission/get method", () => {
        const test = EmailSubmission.request.get({
            accountId: "example",
        });

        expect(test.name).toBe("EmailSubmission/get");
    });

    it("should expose the submission capability URI on EmailSubmissionInvocation instances", () => {
        const test = EmailSubmission.request.get({
            accountId: "example",
        });

        expect(test.uri).toBe(SUBMISSION_CAPABILITY_URI);
    });

    it("should create the EmailSubmission/get method with the expected arguments", () => {
        const test = EmailSubmission.request.get({
            accountId: "example",
            ids: ["1", "2", "3"],
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("ids")).toBe(true);
        expect(test.hasArgument("properties")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("ids")).toHaveLength(3);
    });

    it("should create the EmailSubmission/changes method with the expected arguments", () => {
        const test = EmailSubmission.request.changes({
            accountId: "example",
            sinceState: "state123",
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("sinceState")).toBe(true);
        expect(test.hasArgument("maxChanges")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("sinceState")).toBe("state123");
    });

    it("should create the EmailSubmission/query method with the expected arguments", () => {
        const test = EmailSubmission.request.query({
            accountId: "example",
            filter: { undoStatus: "pending" },
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("filter")).toBe(true);
        expect(test.hasArgument("calculateTotal")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
    });

    it("should create the EmailSubmission/queryChanges method with the expected arguments", () => {
        const test = EmailSubmission.request.queryChanges({
            accountId: "example",
            sinceQueryState: "state123",
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("sinceQueryState")).toBe(true);
        expect(test.hasArgument("calculateTotal")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
        expect(test.getArgument("sinceQueryState")).toBe("state123");
    });

    it("should create the EmailSubmission/set method with the expected arguments", () => {
        const test = EmailSubmission.request.set({
            accountId: "example",
            create: {
                k1: {
                    identityId: "identity-id",
                    emailId: "email-id",
                },
            },
            onSuccessUpdateEmail: {
                "#k1": { "mailboxIds/sent": true },
            },
        });

        expect(test.hasArgument("accountId")).toBe(true);
        expect(test.hasArgument("create")).toBe(true);
        expect(test.hasArgument("onSuccessUpdateEmail")).toBe(true);
        expect(test.hasArgument("ifInState")).toBe(false);

        expect(test.getArgument("accountId")).toBe("example");
    });
});
