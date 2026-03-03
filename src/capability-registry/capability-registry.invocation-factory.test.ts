import { beforeEach, describe, expect, it } from "vitest";
import { BlobCapability } from "../capabilities/blob-capability.js";
import { CoreCapability } from "../capabilities/core-capability.js";
import { EmailCapability } from "../capabilities/email-capability.js";
import type { JMAPCapability } from "../common/types.js";
import { createEmitter } from "../jmap-client/utils/emitter.js";
import { createLogger } from "../jmap-client/utils/logger.js";
import { CapabilityRegistry } from "./capability-registry.js";

describe("CapabilityRegistry Invocation Factory indexing", () => {
    let registry: CapabilityRegistry;

    beforeEach(() => {
        const logger = createLogger(() => undefined);
        const emitter = createEmitter(() => undefined);
        registry = new CapabilityRegistry(CoreCapability, { logger, emitter });
    });

    it("should index invocation factories from Core capability", () => {
        // Test Core data type
        const coreCollection = registry.getInvocationFactoryByDataType("Core");
        expect(coreCollection).toBeDefined();
        expect(coreCollection?.request.echo).toBeDefined();
        expect(coreCollection?.response.echo).toBeDefined();

        // Test individual factory access
        const echoRequestFactory = registry.getInvocationRequestFactory("Core", "echo");
        const echoResponseFactory = registry.getInvocationResponseFactory("Core", "echo");
        expect(echoRequestFactory).toBeDefined();
        expect(echoResponseFactory).toBeDefined();
    });

    it("should index Blob/copy from Core capability", () => {
        // Test Blob data type (from Core capability)
        const blobCollection = registry.getInvocationFactoryByDataType("Blob");
        expect(blobCollection).toBeDefined();
        expect(blobCollection?.request.copy).toBeDefined();
        expect(blobCollection?.response.copy).toBeDefined();

        // Test individual factory access
        const copyRequestFactory = registry.getInvocationRequestFactory("Blob", "copy");
        const copyResponseFactory = registry.getInvocationResponseFactory("Blob", "copy");
        expect(copyRequestFactory).toBeDefined();
        expect(copyResponseFactory).toBeDefined();
    });

    it("should index invocation factories from Email capability", () => {
        // Register Email capability
        const registered = registry.register(EmailCapability);
        expect(registered).toBe(true);

        // Test Email data type
        const emailCollection = registry.getInvocationFactoryByDataType("Email");
        expect(emailCollection).toBeDefined();
        expect(emailCollection?.request.get).toBeDefined();
        expect(emailCollection?.response.get).toBeDefined();

        // Test Mailbox data type
        const mailboxCollection = registry.getInvocationFactoryByDataType("Mailbox");
        expect(mailboxCollection).toBeDefined();
        expect(mailboxCollection?.request.query).toBeDefined();
        expect(mailboxCollection?.response.query).toBeDefined();

        // Test Thread data type
        const threadCollection = registry.getInvocationFactoryByDataType("Thread");
        expect(threadCollection).toBeDefined();
        expect(threadCollection?.request.get).toBeDefined();
        expect(threadCollection?.response.get).toBeDefined();
    });

    it("should return undefined for non-existent data types", () => {
        const nonExistent = registry.getInvocationFactoryByDataType("NonExistent");
        expect(nonExistent).toBeUndefined();
    });

    it("should return undefined for non-existent method names", () => {
        const nonExistentMethod = registry.getInvocationRequestFactory("Core", "nonExistentMethod");
        expect(nonExistentMethod).toBeUndefined();
    });

    it("should handle merging of data types from multiple capabilities", () => {
        // This tests the scenario where Blob methods could come from multiple capabilities
        // Core already has Blob/copy, future Blob capability would add more methods

        const blobCollectionBefore = registry.getInvocationFactoryByDataType("Blob");
        expect(blobCollectionBefore?.request.copy).toBeDefined();

        // If we had a separate Blob capability with additional methods, they would be merged
        // For now, just verify the current structure
        expect(Object.keys(blobCollectionBefore?.request ?? {})).toContain("copy");
        expect(Object.keys(blobCollectionBefore?.response ?? {})).toContain("copy");
    });

    it("should merge Blob invocation factories when BlobCapability is registered after Core", () => {
        // Core already has Blob/copy. BlobCapability adds Blob/get, Blob/upload, Blob/lookup.
        const registered = registry.register(BlobCapability);
        expect(registered).toBe(true);

        const blobCollection = registry.getInvocationFactoryByDataType("Blob");
        expect(blobCollection).toBeDefined();

        // From Core
        expect(blobCollection?.request.copy).toBeDefined();
        expect(blobCollection?.response.copy).toBeDefined();

        // From BlobCapability
        expect(blobCollection?.request.get).toBeDefined();
        expect(blobCollection?.response.get).toBeDefined();
        expect(blobCollection?.request.upload).toBeDefined();
        expect(blobCollection?.response.upload).toBeDefined();
        expect(blobCollection?.request.lookup).toBeDefined();
        expect(blobCollection?.response.lookup).toBeDefined();

        // Individual factory access should also work
        expect(registry.getInvocationRequestFactory("Blob", "copy")).toBeDefined();
        expect(registry.getInvocationRequestFactory("Blob", "get")).toBeDefined();
        expect(registry.getInvocationRequestFactory("Blob", "upload")).toBeDefined();
    });

    it("should return undefined from getInvocationRequestFactory for an unregistered data type", () => {
        const result = registry.getInvocationRequestFactory("NonExistent", "get");
        expect(result).toBeUndefined();
    });

    it("should return undefined from getInvocationResponseFactory for an unregistered data type", () => {
        const result = registry.getInvocationResponseFactory("NonExistent", "get");
        expect(result).toBeUndefined();
    });

    it("should skip undefined invocation factory collections", () => {
        const capability = {
            uri: "urn:test:sparse" as JMAPCapability,
            invocations: {
                Foo: undefined,
            },
        };

        registry.register(capability);

        // Foo should not be indexed since its collection was undefined
        expect(registry.getInvocationFactoryByDataType("Foo")).toBeUndefined();
    });
});
