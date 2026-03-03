import { describe, expect, it } from "vitest";
import type { ValidationResult } from "../capability-registry/types.js";
import { CORE_CAPABILITY_URI, EMAIL_CAPABILITY_URI } from "../common/registry.js";
import type { Id, JMAPServerCapabilities } from "../common/types.js";
import type { JMAPAccount } from "../jmap-client/types.js";
import {
    emailAccountSupportPlugin,
    EmailCapability,
    emailQueryValidationPlugin,
    mailboxSetValidationPlugin,
    preventEmailImportOnReadOnlyAccountPlugin,
} from "./email-capability.js";
import { Email } from "./email/email.js";
import { Mailbox } from "./mailbox/mailbox.js";

describe("Email Capability Tests", () => {
    // Mock server capabilities with the Email capability
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
        // Only indicating support for the capability at the server level
        [EMAIL_CAPABILITY_URI]: {},
    };

    // Mock account capabilities
    const account123: Readonly<JMAPAccount> = {
        name: "Test Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            [EMAIL_CAPABILITY_URI]: {
                maxMailboxesPerEmail: 10,
                maxMailboxDepth: 10,
                maxSizeMailboxName: 200,
                maxSizeAttachmentsPerEmail: 20000000,
                emailQuerySortOptions: ["receivedAt", "sentAt", "size", "from", "to", "subject"],
                mayCreateTopLevelMailbox: true,
            },
        },
    };

    const restrictedAccounts: Readonly<JMAPAccount> = {
        name: "Restricted Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            [EMAIL_CAPABILITY_URI]: {
                maxMailboxesPerEmail: 10,
                maxMailboxDepth: 10,
                maxSizeMailboxName: 200,
                maxSizeAttachmentsPerEmail: 20000000,
                emailQuerySortOptions: ["receivedAt", "sentAt", "size", "from", "to", "subject"],
                mayCreateTopLevelMailbox: false,
            },
        },
    };

    const accountNoEmail: Readonly<JMAPAccount> = {
        name: "No Email Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            // No EMAIL_CAPABILITY_URI for this account
        },
    };

    const accountReadOnly: Readonly<JMAPAccount> = {
        name: "Read-Only Account",
        isPersonal: true,
        isReadOnly: true,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            [EMAIL_CAPABILITY_URI]: {
                maxMailboxesPerEmail: 10,
                maxMailboxDepth: 10,
                maxSizeMailboxName: 200,
                maxSizeAttachmentsPerEmail: 20000000,
                emailQuerySortOptions: ["receivedAt", "sentAt", "size", "from", "to", "subject"],
                mayCreateTopLevelMailbox: true,
            },
        },
    };

    const accounts: Readonly<Record<Id, JMAPAccount>> = {
        account123: account123,
        accountNoEmail: accountNoEmail,
        "restricted-account": restrictedAccounts,
        "read-only-account": accountReadOnly,
    };

    describe("emailAccountSupportPlugin", () => {
        // Use the imported plugin directly

        it("should be defined", () => {
            expect(emailAccountSupportPlugin).toBeDefined();
        });

        it("should validate when account supports Email capability", async () => {
            const invocation = Email.request.query({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await emailAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should invalidate when accountId is missing or empty", async () => {
            const invocation = Email.request.query({
                accountId: "",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await emailAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Invocation is missing a valid accountId argument.`));
        });

        it("should invalidate when account does not exist", async () => {
            const invocation = Email.request.query({
                accountId: "nonexistent",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await emailAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent" does not exist.`));
        });

        it("should invalidate when account doesn't support Email capability", async () => {
            const invocation = Email.request.query({
                accountId: "accountNoEmail",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await emailAccountSupportPlugin.validate(context);
            expect(result.valid).toBe(false);

            expect(result.errors).toContainEqual(
                new Error(`Account "accountNoEmail" does not support the Email capability.`),
            );
        });
    });

    describe("mailboxSetValidationPlugin", () => {
        // Use the imported plugin directly

        it("should be defined", () => {
            expect(mailboxSetValidationPlugin).toBeDefined();
        });

        it("should validate when mailbox name is within length limits", async () => {
            const invocation = Mailbox.request.set({
                accountId: "account123",
                create: {
                    clientId1: { name: "Inbox", parentId: null },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await mailboxSetValidationPlugin.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should invalidate when mailbox name exceeds length limit", async () => {
            // Create a name that exceeds the 200 octet limit
            const longName = "X".repeat(250);

            const invocation = Mailbox.request.set({
                accountId: "account123",
                create: {
                    clientId2: { name: longName, parentId: null },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await mailboxSetValidationPlugin.validate(context);
            expect(result.valid).toBe(false);
            const errorMessage = "exceeds maximum length of 200 octets";
            expect(result.errors?.some((error) => error.message.includes(errorMessage))).toBe(true);
        });

        it("should validate when creating a top-level mailbox is allowed", async () => {
            const invocation = Mailbox.request.set({
                accountId: "account123",
                create: {
                    clientId3: { name: "Top Level", parentId: null },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await mailboxSetValidationPlugin.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should invalidate when creating a top-level mailbox is not allowed", async () => {
            // Modify account to disallow top-level mailboxes
            const invocation = Mailbox.request.set({
                accountId: "restricted-account",
                create: {
                    clientId4: { name: "Top Level", parentId: null },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await mailboxSetValidationPlugin.validate(context);
            expect(result.valid).toBe(false);
            const errorMessage = `Account "restricted-account" does not allow creating top-level mailboxes`;
            expect(result.errors).toContainEqual(new Error(errorMessage));
        });

        it("should invalidate when account does not exist", async () => {
            const invocation = Mailbox.request.set({
                accountId: "nonexistent",
                create: {
                    clientId1: { name: "Inbox", parentId: null },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await mailboxSetValidationPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent" does not exist.`));
        });

        it("should validate when create is undefined", async () => {
            const invocation = Mailbox.request.set({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await mailboxSetValidationPlugin.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should throw error when not a Mailbox/set invocation", () => {
            const invocation = Mailbox.request.get({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            // @ts-expect-error: Testing error handling
            expect(() => mailboxSetValidationPlugin.validate(context)).toThrow();
        });
    });

    describe("emailQueryValidationPlugin", () => {
        // Use the imported plugin directly

        it("should be defined", () => {
            expect(emailQueryValidationPlugin).toBeDefined();
        });

        it("should validate when sort properties are supported", async () => {
            const invocation = Email.request.query({
                accountId: "account123",
                sort: [{ property: "receivedAt" }, { property: "size" }],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await emailQueryValidationPlugin.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should invalidate when sort properties are not supported", async () => {
            // Create an invocation with an unsupported property
            const invocation = Email.request.query({
                accountId: "account123",
                sort: [
                    { property: "receivedAt" },
                    // @ts-expect-error: Intentionally using unsupported property for testing
                    { property: "unsupportedProperty" },
                ],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await emailQueryValidationPlugin.validate(context);
            expect(result.valid).toBe(false);
            const errorMessage = "Unsupported sort property 'unsupportedProperty'";
            expect(result.errors?.some((error) => error.message.includes(errorMessage))).toBe(true);
        });

        it("should invalidate when account does not exist", async () => {
            const invocation = Email.request.query({
                accountId: "nonexistent",
                sort: [{ property: "receivedAt" }],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await emailQueryValidationPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account nonexistent does not exist.`));
        });

        it("should validate when sort is undefined", async () => {
            const invocation = Email.request.query({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await emailQueryValidationPlugin.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should throw error when not an Email/query invocation", () => {
            const invocation = Email.request.get({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            // @ts-expect-error: Testing error handling
            expect(() => emailQueryValidationPlugin.validate(context)).toThrow();
        });
    });

    describe("preventEmailImportOnReadOnlyAccountPlugin", () => {
        it("should be defined", () => {
            expect(preventEmailImportOnReadOnlyAccountPlugin).toBeDefined();
        });

        it("should validate when account is not read-only", async () => {
            const invocation = Email.request.import({
                accountId: "account123",
                emails: {
                    e1: {
                        blobId: "b1",
                        mailboxIds: { mbox1: true },
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await preventEmailImportOnReadOnlyAccountPlugin.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should invalidate when account is read-only", async () => {
            const invocation = Email.request.import({
                accountId: "read-only-account",
                emails: {
                    e1: {
                        blobId: "b1",
                        mailboxIds: { mbox1: true },
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result: ValidationResult = await preventEmailImportOnReadOnlyAccountPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error('Account "read-only-account" is read-only'));
        });

        it("should throw error when not an Email/import invocation", () => {
            const invocation = Email.request.query({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            // @ts-expect-error: Testing error handling
            expect(() => preventEmailImportOnReadOnlyAccountPlugin.validate(context)).toThrow(
                `Expected invocation to be "Email/import", but got "Email/query"`,
            );
        });
    });

    describe("EmailCapability", () => {
        it("should have the correct URI", () => {
            expect(EmailCapability.uri).toBe(EMAIL_CAPABILITY_URI);
        });

        it("should have the required invocations", () => {
            // Check Email invocations
            expect(EmailCapability.invocations.Email.request.get).toBeDefined();
            expect(EmailCapability.invocations.Email.request.query).toBeDefined();
            expect(EmailCapability.invocations.Email.request.set).toBeDefined();
            expect(EmailCapability.invocations.Email.request.changes).toBeDefined();
            expect(EmailCapability.invocations.Email.request.queryChanges).toBeDefined();
            expect(EmailCapability.invocations.Email.response.get).toBeDefined();

            // Check Mailbox invocations
            expect(EmailCapability.invocations.Mailbox.request.get).toBeDefined();
            expect(EmailCapability.invocations.Mailbox.request.set).toBeDefined();
            expect(EmailCapability.invocations.Mailbox.response.get).toBeDefined();

            // Check Thread invocations
            expect(EmailCapability.invocations.Thread.request.get).toBeDefined();
            expect(EmailCapability.invocations.Thread.response.get).toBeDefined();
        });

        it("should include all four plugins", () => {
            expect(EmailCapability.validators).toBeDefined();

            // Verify that our imported plugins are the same ones used in the capability
            expect(EmailCapability.validators).toContain(emailAccountSupportPlugin);
            expect(EmailCapability.validators).toContain(mailboxSetValidationPlugin);
            expect(EmailCapability.validators).toContain(emailQueryValidationPlugin);
            expect(EmailCapability.validators).toContain(preventEmailImportOnReadOnlyAccountPlugin);
        });
    });
});
