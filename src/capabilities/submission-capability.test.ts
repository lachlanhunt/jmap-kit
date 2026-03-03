import { describe, expect, it } from "vitest";
import { CORE_CAPABILITY_URI, SUBMISSION_CAPABILITY_URI } from "../common/registry.js";
import type { Id, JMAPServerCapabilities } from "../common/types.js";
import type { JMAPAccount } from "../jmap-client/types.js";
import { EmailSubmission } from "./emailsubmission/emailsubmission.js";
import { SubmissionCapability, submissionAccountSupportPlugin } from "./submission-capability.js";

describe("Submission Capability Tests", () => {
    const serverCapabilities: Readonly<JMAPServerCapabilities> = {
        [CORE_CAPABILITY_URI]: {
            maxSizeUpload: 50000000,
            maxConcurrentUpload: 4,
            maxSizeRequest: 10000000,
            maxConcurrentRequests: 4,
            maxCallsInRequest: 16,
            maxObjectsInGet: 500,
            maxObjectsInSet: 500,
            collationAlgorithms: ["i;ascii-numeric", "i;ascii-casemap", "i;octet"],
        },
        [SUBMISSION_CAPABILITY_URI]: {},
    };

    const account123: Readonly<JMAPAccount> = {
        name: "Test Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            [SUBMISSION_CAPABILITY_URI]: {
                maxDelayedSend: 44236800,
                submissionExtensions: {},
            },
        },
    };

    const accountNoSubmission: Readonly<JMAPAccount> = {
        name: "No Submission Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
        },
    };

    const accountReadOnly: Readonly<JMAPAccount> = {
        name: "Read-Only Account",
        isPersonal: true,
        isReadOnly: true,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            [SUBMISSION_CAPABILITY_URI]: {
                maxDelayedSend: 0,
                submissionExtensions: {},
            },
        },
    };

    const accounts: Readonly<Record<Id, JMAPAccount>> = {
        account123: account123,
        accountNoSubmission: accountNoSubmission,
        "read-only-account": accountReadOnly,
    };

    describe("submissionAccountSupportPlugin", () => {
        it("should validate when account supports Submission capability", async () => {
            const invocation = EmailSubmission.request.get({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await submissionAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should invalidate when accountId is missing", async () => {
            const invocation = EmailSubmission.request.get({
                accountId: "",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await submissionAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Invocation is missing a valid accountId argument.`));
        });

        it("should invalidate when account does not exist", async () => {
            const invocation = EmailSubmission.request.get({
                accountId: "nonexistent",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await submissionAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent" does not exist.`));
        });

        it("should invalidate when account does not support Submission capability", async () => {
            const invocation = EmailSubmission.request.get({
                accountId: "accountNoSubmission",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await submissionAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                new Error(`Account "accountNoSubmission" does not support the Submission capability.`),
            );
        });
    });

    describe("SubmissionCapability", () => {
        it("should have the correct URI", () => {
            expect(SubmissionCapability.uri).toBe(SUBMISSION_CAPABILITY_URI);
        });

        it("should have the required invocations", () => {
            expect(SubmissionCapability.invocations.EmailSubmission.request.get).toBeDefined();
            expect(SubmissionCapability.invocations.EmailSubmission.request.changes).toBeDefined();
            expect(SubmissionCapability.invocations.EmailSubmission.request.query).toBeDefined();
            expect(SubmissionCapability.invocations.EmailSubmission.request.queryChanges).toBeDefined();
            expect(SubmissionCapability.invocations.EmailSubmission.request.set).toBeDefined();
            expect(SubmissionCapability.invocations.EmailSubmission.response.get).toBeDefined();

            expect(SubmissionCapability.invocations.Identity.request.get).toBeDefined();
            expect(SubmissionCapability.invocations.Identity.request.changes).toBeDefined();
            expect(SubmissionCapability.invocations.Identity.request.set).toBeDefined();
            expect(SubmissionCapability.invocations.Identity.response.get).toBeDefined();
        });

        it("should include the account support validator", () => {
            expect(SubmissionCapability.validators).toHaveLength(1);
            expect(SubmissionCapability.validators).toContain(submissionAccountSupportPlugin);
        });
    });
});
