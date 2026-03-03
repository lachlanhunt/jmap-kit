import { describe, expect, it } from "vitest";
import { BLOB_CAPABILITY_URI, CORE_CAPABILITY_URI } from "../common/registry.js";
import type { Id, JMAPServerCapabilities } from "../common/types.js";
import type { JMAPAccount } from "../jmap-client/types.js";
import {
    BlobCapability,
    blobAccountSupportPlugin,
    blobCopyValidationPlugin,
    blobUploadValidationPlugin,
    preventBlobUploadOnReadOnlyAccountPlugin,
} from "./blob-capability.js";
import { Blob } from "./blob/blob.js";

describe("Blob Capability Tests", () => {
    // Mock server capabilities with the Blob capability
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
        [BLOB_CAPABILITY_URI]: {},
    };

    // Mock account capabilities
    const account123: Readonly<JMAPAccount> = {
        name: "Test Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            [BLOB_CAPABILITY_URI]: {
                maxSizeBlobSet: 1000000, // 1 MB
                maxDataSources: 64,
                supportedTypeNames: ["Email", "Mailbox"],
                supportedDigestAlgorithms: ["sha", "sha-256"],
            },
        },
    };

    const accountNoBlob: Readonly<JMAPAccount> = {
        name: "No Blob Account",
        isPersonal: true,
        isReadOnly: false,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            // No BLOB_CAPABILITY_URI for this account
        },
    };

    const accountReadOnly: Readonly<JMAPAccount> = {
        name: "Read-Only Account",
        isPersonal: true,
        isReadOnly: true,
        accountCapabilities: {
            [CORE_CAPABILITY_URI]: {},
            [BLOB_CAPABILITY_URI]: {
                maxSizeBlobSet: 1000000,
                maxDataSources: 64,
                supportedTypeNames: ["Email", "Mailbox"],
                supportedDigestAlgorithms: ["sha", "sha-256"],
            },
        },
    };

    const accounts: Readonly<Record<Id, JMAPAccount>> = {
        account123: account123,
        account456: {
            ...account123,
            name: "Target Account",
        },
        accountNoBlob: accountNoBlob,
        "read-only-account": accountReadOnly,
    };

    describe("BlobCapability", () => {
        it("should have the correct URI", () => {
            expect(BlobCapability.uri).toBe(BLOB_CAPABILITY_URI);
        });

        it("should define blob invocations", () => {
            expect(BlobCapability.invocations.Blob.request.upload).toBeDefined();
            expect(BlobCapability.invocations.Blob.request.get).toBeDefined();
            expect(BlobCapability.invocations.Blob.request.lookup).toBeDefined();
            expect(BlobCapability.invocations.Blob.response.upload).toBeDefined();
            expect(BlobCapability.invocations.Blob.response.get).toBeDefined();
            expect(BlobCapability.invocations.Blob.response.lookup).toBeDefined();
        });

        it("should have four validators", () => {
            expect(BlobCapability.validators).toHaveLength(4);
            expect(BlobCapability.validators).toContain(blobAccountSupportPlugin);
            expect(BlobCapability.validators).toContain(blobCopyValidationPlugin);
            expect(BlobCapability.validators).toContain(blobUploadValidationPlugin);
            expect(BlobCapability.validators).toContain(preventBlobUploadOnReadOnlyAccountPlugin);
        });
    });

    describe("blobAccountSupportPlugin", () => {
        it("should validate when account supports Blob capability", async () => {
            const invocation = Blob.request.upload({
                accountId: "account123",
                create: {},
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobAccountSupportPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when accountId is missing", async () => {
            const invocation = Blob.request.upload({
                accountId: "",
                create: {},
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobAccountSupportPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Invocation is missing a valid accountId argument.`));
        });

        it("should invalidate when account does not exist", async () => {
            const invocation = Blob.request.upload({
                accountId: "nonexistent",
                create: {},
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobAccountSupportPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent" does not exist.`));
        });

        it("should invalidate when account does not support Blob capability", async () => {
            const invocation = Blob.request.upload({
                accountId: "accountNoBlob",
                create: {},
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobAccountSupportPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                new Error(`Account "accountNoBlob" does not support the Blob capability.`),
            );
        });
    });

    describe("blobCopyValidationPlugin", () => {
        it("should validate when copying between different accounts", async () => {
            const invocation = Blob.request.copy({
                accountId: "account123",
                fromAccountId: "account456",
                blobIds: ["blob1", "blob2"],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobCopyValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when copying within the same account", async () => {
            const invocation = Blob.request.copy({
                accountId: "account123",
                fromAccountId: "account123",
                blobIds: ["blob1", "blob2"],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobCopyValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                new Error(`Cannot copy blobs to the same account. fromAccountId and accountId must differ.`),
            );
        });

        it("should invalidate when target account does not exist", async () => {
            const invocation = Blob.request.copy({
                accountId: "nonexistent",
                fromAccountId: "account123",
                blobIds: ["blob1"],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobCopyValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent" does not exist.`));
        });

        it("should invalidate when source account does not exist", async () => {
            const invocation = Blob.request.copy({
                accountId: "account123",
                fromAccountId: "nonexistent",
                blobIds: ["blob1"],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobCopyValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent" does not exist.`));
        });

        it("should invalidate when both accounts do not exist", async () => {
            const invocation = Blob.request.copy({
                accountId: "nonexistent1",
                fromAccountId: "nonexistent2",
                blobIds: ["blob1"],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobCopyValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(2);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent1" does not exist.`));
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent2" does not exist.`));
        });
    });

    describe("blobUploadValidationPlugin", () => {
        it("should validate when data property is missing or not an array", async () => {
            const invocation = Blob.request.upload({
                accountId: "account123",
                create: {
                    blob1: {
                        type: "text/plain",
                    } as never,
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobUploadValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should validate when upload is within limits", async () => {
            const invocation = Blob.request.upload({
                accountId: "account123",
                create: {
                    blob1: {
                        data: [{ "data:asText": "Hello, World!" }],
                        type: "text/plain",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobUploadValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should validate when create is empty", async () => {
            const invocation = Blob.request.upload({
                accountId: "account123",
                create: {},
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobUploadValidationPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when account does not exist", async () => {
            const invocation = Blob.request.upload({
                accountId: "nonexistent",
                create: {},
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobUploadValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent" does not exist.`));
        });

        it("should invalidate when account does not support Blob capability", async () => {
            const invocation = Blob.request.upload({
                accountId: "accountNoBlob",
                create: {},
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobUploadValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                new Error(`Account "accountNoBlob" does not support the Blob capability.`),
            );
        });

        it("should invalidate when data source count exceeds limit", async () => {
            const dataSources = Array.from({ length: 100 }, (_, i) => ({
                "data:asText": `chunk${i}`,
            }));

            const invocation = Blob.request.upload({
                accountId: "account123",
                create: {
                    blob1: {
                        data: dataSources,
                        type: "text/plain",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobUploadValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(
                new Error(`Blob "blob1" has 100 data sources, but account limit is 64`),
            );
        });

        it("should invalidate when blob size exceeds limit (text)", async () => {
            // Create a blob larger than 1MB (account limit is 1000000 bytes)
            const largeText = "x".repeat(1500000);

            const invocation = Blob.request.upload({
                accountId: "account123",
                create: {
                    blob1: {
                        data: [{ "data:asText": largeText }],
                        type: "text/plain",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobUploadValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors?.[0]?.message).toMatch(/Blob "blob1" size \(\d+\.\d+ KB\) exceeds account limit/);
        });

        it("should invalidate when blob size exceeds limit (base64)", async () => {
            // Create a base64 blob larger than 1MB
            // Base64: 4 chars = 3 bytes (without padding)
            // To get 1.5MB of data, we need ~2MB of base64
            // Using "AAAA" (no padding) where each 4 chars = 3 bytes
            // 2,000,000 chars / 4 * 3 = 1,500,000 bytes = 1.5 MB
            const largeBase64 = "AAAA".repeat(500000); // 2,000,000 chars = 1.5MB of data

            const invocation = Blob.request.upload({
                accountId: "account123",
                create: {
                    blob1: {
                        data: [{ "data:asBase64": largeBase64 }],
                        type: "application/octet-stream",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobUploadValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors?.[0]?.message).toMatch(/Blob "blob1" size \(\d+\.\d+ KB\) exceeds account limit/);
        });

        it("should validate when blob references another blob (size cannot be calculated)", async () => {
            const invocation = Blob.request.upload({
                accountId: "account123",
                create: {
                    blob1: {
                        data: [
                            { "data:asText": "Prefix: " },
                            { blobId: "existingBlob123", offset: 0, length: 1000000 },
                            { "data:asText": " Suffix" },
                        ],
                        type: "application/octet-stream",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobUploadValidationPlugin.validate(context);

            // Should validate because we can't calculate size with blob references
            expect(result.valid).toBe(true);
        });

        it("should handle multiple validation errors", async () => {
            const dataSources = Array.from({ length: 100 }, (_, _i) => ({
                "data:asText": "x".repeat(20000), // Each chunk is 20KB, total > 2MB
            }));

            const invocation = Blob.request.upload({
                accountId: "account123",
                create: {
                    blob1: {
                        data: dataSources,
                        type: "text/plain",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await blobUploadValidationPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(2);
            expect(result.errors).toContainEqual(
                new Error(`Blob "blob1" has 100 data sources, but account limit is 64`),
            );
            expect(result.errors?.[1]?.message).toMatch(/Blob "blob1" size \(\d+\.\d+ KB\) exceeds account limit/);
        });

        it("should handle no maxSizeBlobSet limit (null)", async () => {
            const accountsUnlimited: Readonly<Record<Id, JMAPAccount>> = {
                account123: {
                    ...account123,
                    accountCapabilities: {
                        [CORE_CAPABILITY_URI]: {},
                        [BLOB_CAPABILITY_URI]: {
                            maxSizeBlobSet: null, // No size limit
                            maxDataSources: 64,
                            supportedTypeNames: ["Email"],
                            supportedDigestAlgorithms: ["sha-256"],
                        },
                    },
                },
            };

            const largeText = "x".repeat(5000000); // 5MB, would exceed 1MB limit

            const invocation = Blob.request.upload({
                accountId: "account123",
                create: {
                    blob1: {
                        data: [{ "data:asText": largeText }],
                        type: "text/plain",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts: accountsUnlimited,
                invocation,
            } as const;

            const result = await blobUploadValidationPlugin.validate(context);

            // Should validate because there's no size limit
            expect(result.valid).toBe(true);
        });
    });

    describe("preventBlobUploadOnReadOnlyAccountPlugin", () => {
        it("should validate when account is not read-only", async () => {
            const invocation = Blob.request.upload({
                accountId: "account123",
                create: {
                    blob1: {
                        data: [{ "data:asText": "test" }],
                        type: "text/plain",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await preventBlobUploadOnReadOnlyAccountPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when account is read-only", async () => {
            const invocation = Blob.request.upload({
                accountId: "read-only-account",
                create: {
                    blob1: {
                        data: [{ "data:asText": "test" }],
                        type: "text/plain",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await preventBlobUploadOnReadOnlyAccountPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "read-only-account" is read-only`));
        });

        it("should invalidate when account does not exist", async () => {
            const invocation = Blob.request.upload({
                accountId: "nonexistent",
                create: {
                    blob1: {
                        data: [{ "data:asText": "test" }],
                        type: "text/plain",
                    },
                },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await preventBlobUploadOnReadOnlyAccountPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent" does not exist.`));
        });
    });
});
