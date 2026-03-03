import { describe, expect, it } from "vitest";
import { CORE_CAPABILITY_URI } from "../common/registry.js";

import type { ValidationPluginContext } from "../capability-registry/types.js";
import type { Id, JMAPRequestInvocation, JMAPServerCapabilities } from "../common/types.js";
import type { JMAPAccount } from "../jmap-client/types.js";
import { Blob } from "./blob/blob.js";
import {
    collationAlgorithmsPlugin,
    CoreCapability,
    maxCallsInRequestPlugin,
    maxObjectsInGetPlugin,
    maxObjectsInSetPlugin,
    maxSizeRequestPlugin,
    preventBlobCopyOnReadOnlyAccountPlugin,
    preventSetOnReadOnlyAccountPlugin,
} from "./core-capability.js";
import { Example } from "./example/example.js";

describe("Core Capability Tests", () => {
    const serverCapabilities: Readonly<JMAPServerCapabilities> = {
        "urn:ietf:params:jmap:core": {
            maxObjectsInGet: 10,
            maxSizeUpload: 2500,
            maxSizeRequest: 5_000_000,
            maxConcurrentRequests: 10,
            maxCallsInRequest: 50,
            maxConcurrentUpload: 10,
            maxObjectsInSet: 15,
            collationAlgorithms: ["i;ascii-numeric", "i;ascii-casemap", "i;octet"],
        },
    };

    // Mock accounts for testing
    const account123: Readonly<JMAPAccount> = {
        name: "Test Account",
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
        },
    };

    const accounts: Readonly<Record<Id, JMAPAccount>> = {
        account123,
        "read-only-account": accountReadOnly,
    };

    describe("maxObjectsInGetPlugin", () => {
        it("should validate when number of ids is within limit", async () => {
            const invocation = Example.request.get({
                accountId: "account123",
                ids: ["id1", "id2", "id3"],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maxObjectsInGetPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when number of ids exceeds limit", async () => {
            const ids = Array.from({ length: 15 }, (_, i) => `id${i}`); // 15 ids, limit is 10
            const invocation = Example.request.get({
                accountId: "account123",
                ids,
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maxObjectsInGetPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Request contains 15 objects, but server limit is 10`));
        });

        it("should validate when ids is undefined", async () => {
            const invocation = Example.request.get({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maxObjectsInGetPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should throw error when method is not 'get'", () => {
            const invocation = Example.request.set({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            // @ts-expect-error: Testing error handling
            expect(() => maxObjectsInGetPlugin.validate(context)).toThrow("Expected invocation method to be 'get'");
        });
    });

    describe("maxObjectsInSetPlugin", () => {
        it("should validate when total number of operations is within limit", async () => {
            const invocation = Example.request.set({
                accountId: "account123",
                create: { client1: { prop: "value1" }, client2: { prop: "value2" } },
                update: { server1: { prop: "updated" } },
                destroy: ["server2", "server3"],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maxObjectsInSetPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when total number of operations exceeds limit", async () => {
            // Create 10 items for create
            const create = Array.from({ length: 10 }, (_, i) => [`client${i}`, { prop: `value${i}` }]).reduce(
                (acc, [key, val]) => ({ ...acc, [key as string]: val }),
                {},
            );

            // Create 10 items for update
            const update = Array.from({ length: 10 }, (_, i) => [`server${i}`, { prop: `updated${i}` }]).reduce(
                (acc, [key, val]) => ({ ...acc, [key as string]: val }),
                {},
            );

            // Create 10 items for destroy (total: 30 operations, limit is 15)
            const destroy = Array.from({ length: 10 }, (_, i) => `destroyId${i}`);

            const invocation = Example.request.set({
                accountId: "account123",
                create,
                update,
                destroy,
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maxObjectsInSetPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Request contains 30 operations, but server limit is 15`));
        });

        it("should validate when all operation fields are undefined", async () => {
            const invocation = Example.request.set({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await maxObjectsInSetPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should throw error when method is not 'set'", () => {
            const invocation = Example.request.get({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            // @ts-expect-error: Testing error handling
            expect(() => maxObjectsInSetPlugin.validate(context)).toThrow("Expected invocation method to be 'set'");
        });
    });

    describe("collationAlgorithmsPlugin", () => {
        it("should validate when all collation algorithms are supported", async () => {
            const invocation = Example.request.query({
                accountId: "account123",
                sort: [
                    { property: "prop1", collation: "i;ascii-numeric" },
                    { property: "prop2", collation: "i;ascii-casemap" },
                ],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await collationAlgorithmsPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when unsupported collation algorithm is used", async () => {
            const invocation = Example.request.query({
                accountId: "account123",
                sort: [
                    { property: "prop1", collation: "i;ascii-numeric" },
                    { property: "prop2", collation: "i;unknown-collation" }, // unsupported
                ],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await collationAlgorithmsPlugin.validate(context);

            expect(result.valid).toBe(false);
            const errorMessage = "Unsupported collation algorithm 'i;unknown-collation'";
            expect(result.errors?.some((error) => error.message.includes(errorMessage))).toBe(true);
        });

        it("should validate when sort has no collation specified", async () => {
            const invocation = Example.request.query({
                accountId: "account123",
                sort: [
                    { property: "prop1" }, // No collation specified
                    { property: "prop2" },
                ],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await collationAlgorithmsPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should validate when sort is undefined", async () => {
            const invocation = Example.request.query({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await collationAlgorithmsPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should throw error when method is not 'query'", () => {
            const invocation = Example.request.get({
                accountId: "account123",
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            // @ts-expect-error: Testing error handling
            expect(() => collationAlgorithmsPlugin.validate(context)).toThrow(
                "Expected invocation method to be 'query'",
            );
        });
    });

    describe("preventSetOnReadOnlyAccountPlugin", () => {
        it("should validate when account is not read-only", async () => {
            const invocation = Example.request.set({
                accountId: "account123",
                create: { client1: { prop: "value1" } },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await preventSetOnReadOnlyAccountPlugin.validate(context);
            expect(result.valid).toBe(true);
        });

        it("should invalidate when account is read-only", async () => {
            const invocation = Example.request.set({
                accountId: "read-only-account",
                create: { client1: { prop: "value1" } },
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await preventSetOnReadOnlyAccountPlugin.validate(context);
            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "read-only-account" is read-only`));
        });
    });

    describe("maxSizeRequestPlugin Tests", () => {
        const MEGABYTE = 1_000_000; // 1 MB in bytes

        // Helper function to create a context with different request bodies
        const createContext = (body: string): ValidationPluginContext<"post-serialization"> => ({
            serverCapabilities,
            accounts,
            data: {
                body,
                headers: new Headers({
                    "Content-Type": "application/json",
                }),
            },
        });

        describe("String body validation", () => {
            it("should validate when string size is within limit", async () => {
                // Create a string that's 1MB
                const smallBody = "a".repeat(1 * MEGABYTE);
                const context = createContext(smallBody);

                const result = await maxSizeRequestPlugin.validate(context);

                expect(result.valid).toBe(true);
            });

            it("should invalidate when string size exceeds limit", async () => {
                // Create a string that's 6MB (exceeds 5MB limit)
                const largeBody = "a".repeat(6 * MEGABYTE);
                const context = createContext(largeBody);

                const result = await maxSizeRequestPlugin.validate(context);

                expect(result.valid).toBe(false);
                expect(result.errors).toContainEqual(
                    new Error("Request size (6.00 MB) exceeds server limit of 5.00 MB"),
                );
            });

            it("should correctly calculate UTF-8 encoded size", async () => {
                // Create a string with multi-byte characters
                // Each emoji is typically 4 bytes in UTF-8
                // 1.5M emojis × 4 bytes = ~6MB
                const multiByteBody = "😀".repeat(1.5 * MEGABYTE);
                const context = createContext(multiByteBody);

                const result = await maxSizeRequestPlugin.validate(context);

                expect(result.valid).toBe(false);
                // We're expecting ~6MB, which exceeds the limit
                expect(result.errors).toContainEqual(
                    new Error("Request size (6.00 MB) exceeds server limit of 5.00 MB"),
                );
            });

            it("should validate empty string", async () => {
                const context = createContext("");

                const result = await maxSizeRequestPlugin.validate(context);

                expect(result.valid).toBe(true);
            });
        });

        describe("Edge cases", () => {
            it("should validate when size is exactly at the limit", async () => {
                // Create a string that's exactly 5MB
                const exactSizeBody = "a".repeat(5 * MEGABYTE);
                const context = createContext(exactSizeBody);

                const result = await maxSizeRequestPlugin.validate(context);

                expect(result.valid).toBe(true);
            });

            it("should handle different MEGABYTE definitions correctly", async () => {
                // Some systems define 1MB as 1,048,576 bytes (2^20)
                // We're using 1,000,000 bytes as defined in the constant

                // Create a body just under 5MB in our definition
                const almostLimitBody = "a".repeat(5 * MEGABYTE - 1);
                const context = createContext(almostLimitBody);

                const result = await maxSizeRequestPlugin.validate(context);

                expect(result.valid).toBe(true);
            });
        });
    });

    describe("maxCallsInRequestPlugin", () => {
        it("should validate when number of method calls is within limit", async () => {
            const methodCalls: JMAPRequestInvocation[] = Array(10)
                .fill(0)
                .map((_, i) => ["Example/get", { accountId: "account123" }, `id_${i}`]);

            const context: ValidationPluginContext<"pre-build"> = {
                serverCapabilities,
                accounts,
                data: {
                    using: ["urn:ietf:params:jmap:core"],
                    methodCalls,
                },
            };

            const result = await maxCallsInRequestPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when number of method calls exceeds limit", async () => {
            // Create 60 method calls (server limit is 50)
            const methodCalls: JMAPRequestInvocation[] = Array(60)
                .fill(0)
                .map((_, i) => ["Example/get", { accountId: "account123" }, `id_${i}`]);

            const context: ValidationPluginContext<"pre-build"> = {
                serverCapabilities,
                accounts,
                data: {
                    using: ["urn:ietf:params:jmap:core"],
                    methodCalls,
                },
            };

            const result = await maxCallsInRequestPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error("Request contains 60 methods, but server limit is 50"));
        });
    });

    describe("CoreCapability", () => {
        it("should have the correct URI", () => {
            expect(CoreCapability.uri).toBe(CORE_CAPABILITY_URI);
        });

        it("should have the required invocations", () => {
            expect(CoreCapability.invocations).toHaveProperty("Core.request.echo");
            expect(CoreCapability.invocations).toHaveProperty("Core.response.echo");
            expect(CoreCapability.invocations).toHaveProperty("Blob.request.copy");
            expect(CoreCapability.invocations).toHaveProperty("Blob.response.copy");
        });

        it("should include all plugins", () => {
            expect(CoreCapability.validators).toBeDefined();
            expect(CoreCapability.validators).toHaveLength(7);
            expect(CoreCapability.validators).toContain(maxObjectsInGetPlugin);
            expect(CoreCapability.validators).toContain(maxObjectsInSetPlugin);
            expect(CoreCapability.validators).toContain(collationAlgorithmsPlugin);
            expect(CoreCapability.validators).toContain(preventSetOnReadOnlyAccountPlugin);
            expect(CoreCapability.validators).toContain(preventBlobCopyOnReadOnlyAccountPlugin);
            expect(CoreCapability.validators).toContain(maxCallsInRequestPlugin);
            expect(CoreCapability.validators).toContain(maxSizeRequestPlugin);
        });
    });

    describe("preventBlobCopyOnReadOnlyAccountPlugin", () => {
        it("should validate when target account is not read-only", async () => {
            const invocation = Blob.request.copy({
                accountId: "account123",
                fromAccountId: "read-only-account",
                blobIds: ["blob1"],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await preventBlobCopyOnReadOnlyAccountPlugin.validate(context);

            expect(result.valid).toBe(true);
        });

        it("should invalidate when target account is read-only", async () => {
            const invocation = Blob.request.copy({
                accountId: "read-only-account",
                fromAccountId: "account123",
                blobIds: ["blob1"],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await preventBlobCopyOnReadOnlyAccountPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "read-only-account" is read-only`));
        });

        it("should invalidate when accountId is missing", async () => {
            const invocation = Blob.request.copy({
                accountId: "",
                fromAccountId: "account123",
                blobIds: ["blob1"],
            });

            const context = {
                serverCapabilities,
                accounts,
                invocation,
            } as const;

            const result = await preventBlobCopyOnReadOnlyAccountPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "" does not exist.`));
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

            const result = await preventBlobCopyOnReadOnlyAccountPlugin.validate(context);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(new Error(`Account "nonexistent" does not exist.`));
        });
    });
});
