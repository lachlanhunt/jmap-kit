import { describe, expect, it } from "vitest";
import { CORE_CAPABILITY_URI, MASKED_EMAIL_CAPABILITY_URI } from "../common/registry.js";
import type { Id, JMAPServerCapabilities } from "../common/types.js";
import type { JMAPAccount } from "../jmap-client/types.js";
import {
    MaskedEmailCapability,
    maskedEmailAccountSupportPlugin,
    maskedEmailPrefixValidationPlugin,
    maskedEmailStateValidationPlugin,
} from "./maskedemail-capability.js";
import { MaskedEmail } from "./maskedemail/maskedemail.js";

describe("MaskedEmail Capability Tests", () => {
    // Mock server capabilities with the MaskedEmail capability
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
        [MASKED_EMAIL_CAPABILITY_URI]: {},
    };

    // Mock account capabilities
    const account123: Readonly<JMAPAccount> = {
        name: "Test Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            [MASKED_EMAIL_CAPABILITY_URI]: {},
        },
    };

    const accountNoMaskedEmail: Readonly<JMAPAccount> = {
        name: "No MaskedEmail Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            // No MASKED_EMAIL_CAPABILITY_URI for this account
        },
    };

    const accounts: Readonly<Record<Id, JMAPAccount>> = {
        account123: account123,
        accountNoMaskedEmail: accountNoMaskedEmail,
    };

    describe("MaskedEmailCapability", () => {
        it("should have the correct URI", () => {
            expect(MaskedEmailCapability.uri).toBe(MASKED_EMAIL_CAPABILITY_URI);
        });

        it("should define maskedemail invocations", () => {
            expect(MaskedEmailCapability.invocations.MaskedEmail.request.get).toBeDefined();
            expect(MaskedEmailCapability.invocations.MaskedEmail.request.set).toBeDefined();
            expect(MaskedEmailCapability.invocations.MaskedEmail.response.get).toBeDefined();
            expect(MaskedEmailCapability.invocations.MaskedEmail.response.set).toBeDefined();
        });

        it("should have three validators", () => {
            expect(MaskedEmailCapability.validators).toHaveLength(3);
            expect(MaskedEmailCapability.validators).toContain(maskedEmailAccountSupportPlugin);
            expect(MaskedEmailCapability.validators).toContain(maskedEmailPrefixValidationPlugin);
            expect(MaskedEmailCapability.validators).toContain(maskedEmailStateValidationPlugin);
        });
    });

    describe("maskedEmailAccountSupportPlugin", () => {
        it("should validate when account supports MaskedEmail capability", async () => {
            const invocation = MaskedEmail.request.get({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailAccountSupportPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when accountId is missing", async () => {
            const invocation = MaskedEmail.request.get({
                accountId: "",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailAccountSupportPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Invocation is missing a valid accountId argument.`));
        });

        it("should invalidate when account does not exist", async () => {
            const invocation = MaskedEmail.request.get({
                accountId: "nonexistent",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailAccountSupportPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent" does not exist.`));
        });

        it("should invalidate when account does not support MaskedEmail capability", async () => {
            const invocation = MaskedEmail.request.get({
                accountId: "accountNoMaskedEmail",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailAccountSupportPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                new Error(`Account "accountNoMaskedEmail" does not support the MaskedEmail capability.`),
            );
        });
    });

    describe("maskedEmailPrefixValidationPlugin", () => {
        it("should validate when create is undefined", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailPrefixValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should validate when emailPrefix is within constraints", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                create: {
                    m1: {
                        emailPrefix: "myprefix_123",
                        forDomain: "https://example.com",
                        description: "Test masked email",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailPrefixValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should validate when emailPrefix is not provided", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                create: {
                    m1: {
                        forDomain: "https://example.com",
                        description: "Test masked email",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailPrefixValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should validate when create is empty", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                create: {},
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailPrefixValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when emailPrefix exceeds 64 characters", async () => {
            const longPrefix = "a".repeat(65);

            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                create: {
                    m1: {
                        emailPrefix: longPrefix,
                        forDomain: "https://example.com",
                        description: "Test masked email",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailPrefixValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                new Error(`MaskedEmail "m1" has emailPrefix of 65 characters, but maximum is 64`),
            );
        });

        it("should invalidate when emailPrefix contains uppercase letters", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                create: {
                    m1: {
                        emailPrefix: "MyPrefix",
                        forDomain: "https://example.com",
                        description: "Test masked email",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailPrefixValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                new Error(
                    `MaskedEmail "m1" has invalid emailPrefix. Only lowercase letters (a-z), digits (0-9), and underscores (_) are allowed`,
                ),
            );
        });

        it("should invalidate when emailPrefix contains special characters", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                create: {
                    m1: {
                        emailPrefix: "my-prefix!",
                        forDomain: "https://example.com",
                        description: "Test masked email",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailPrefixValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                new Error(
                    `MaskedEmail "m1" has invalid emailPrefix. Only lowercase letters (a-z), digits (0-9), and underscores (_) are allowed`,
                ),
            );
        });

        it("should handle multiple validation errors", async () => {
            const longPrefix = "A".repeat(65); // Uppercase AND too long

            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                create: {
                    m1: {
                        emailPrefix: longPrefix,
                        forDomain: "https://example.com",
                        description: "Test masked email",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailPrefixValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(2);
            expect(result.errors).toContainEqual(
                new Error(`MaskedEmail "m1" has emailPrefix of 65 characters, but maximum is 64`),
            );
            expect(result.errors).toContainEqual(
                new Error(
                    `MaskedEmail "m1" has invalid emailPrefix. Only lowercase letters (a-z), digits (0-9), and underscores (_) are allowed`,
                ),
            );
        });
    });

    describe("maskedEmailStateValidationPlugin", () => {
        it("should validate when update is undefined", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailStateValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should validate when state is not being set to pending", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                update: {
                    m1: {
                        state: "enabled",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailStateValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should validate when state is not included in update", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                update: {
                    m1: {
                        description: "Updated description",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailStateValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should validate when update is empty", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                update: {},
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailStateValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when trying to set state to pending", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                update: {
                    m1: {
                        state: "pending",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailStateValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                new Error(
                    `MaskedEmail "m1" cannot be set to "pending" state. Once transitioned from pending, it cannot be set back`,
                ),
            );
        });

        it("should handle multiple masked emails being set to pending", async () => {
            const invocation = MaskedEmail.request.set({
                accountId: "account123",
                update: {
                    m1: {
                        state: "pending",
                    },
                    m2: {
                        state: "pending",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maskedEmailStateValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(2);
            expect(result.errors).toContainEqual(
                new Error(
                    `MaskedEmail "m1" cannot be set to "pending" state. Once transitioned from pending, it cannot be set back`,
                ),
            );
            expect(result.errors).toContainEqual(
                new Error(
                    `MaskedEmail "m2" cannot be set to "pending" state. Once transitioned from pending, it cannot be set back`,
                ),
            );
        });
    });
});
