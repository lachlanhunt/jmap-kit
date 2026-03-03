import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import { CORE_CAPABILITY_URI } from "../common/registry.js";
import type { JMAPCapability } from "../common/types.js";
import { createMockClientContext } from "../jmap-client/test-utils.js";
import { CapabilityRegistry } from "./capability-registry.js";
import type { CapabilityDefinition } from "./types.js";

const CORE_SERVER_CAPABILITIES = {
    maxSizeUpload: 50_000_000,
    maxConcurrentUpload: 4,
    maxSizeRequest: 10_000_000,
    maxConcurrentRequests: 4,
    maxCallsInRequest: 16,
    maxObjectsInGet: 500,
    maxObjectsInSet: 500,
    collationAlgorithms: ["i;ascii-casemap"],
};

/**
 * Creates a core capability definition with an optional schema override.
 */
function createCoreCapabilityDef(schema?: CapabilityDefinition["schema"]): CapabilityDefinition {
    return {
        uri: CORE_CAPABILITY_URI,
        invocations: {},
        schema,
    };
}

const CUSTOM_URI = "https://example.com/custom" as JMAPCapability;

describe("CapabilityRegistry.validateServerCapabilities", () => {
    const mockClientContext = createMockClientContext();

    it("reports valid result when server capability data is valid", async () => {
        const coreSchema = z.looseObject({
            maxObjectsInGet: z.number().int().min(0),
        });

        const registry = new CapabilityRegistry(
            createCoreCapabilityDef({ serverCapability: coreSchema }),
            mockClientContext,
        );

        const results = await registry.validateServerCapabilities({
            [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
        });

        expect(results).toEqual([{ valid: true, uri: CORE_CAPABILITY_URI }]);
    });

    it("returns a failure when Core server capability data is invalid", async () => {
        const coreSchema = z.looseObject({
            maxObjectsInGet: z.string(), // Expect string but data has number
        });

        const registry = new CapabilityRegistry(
            createCoreCapabilityDef({ serverCapability: coreSchema }),
            mockClientContext,
        );

        const results = await registry.validateServerCapabilities({
            [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
        });

        expect(results).toHaveLength(1);
        expect(results[0]?.uri).toBe(CORE_CAPABILITY_URI);
        expect(results[0]?.valid).toBe(false);
        if (results[0]?.valid === false) {
            expect(results[0].errors.length).toBeGreaterThan(0);
        }
    });

    it("returns a failure for a non-Core capability with invalid server data", async () => {
        const customServerSchema = z.looseObject({
            requiredProp: z.string(),
        });

        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            schema: { serverCapability: customServerSchema },
        });

        const results = await registry.validateServerCapabilities({
            [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
            [CUSTOM_URI]: { requiredProp: 123 }, // Invalid: should be string
        });

        expect(results).toHaveLength(1);
        expect(results[0]?.uri).toBe(CUSTOM_URI);
        expect(results[0]?.valid).toBe(false);
        if (results[0]?.valid === false) {
            expect(results[0].errors.length).toBeGreaterThan(0);
        }
    });

    it("does not mutate the capabilities object", async () => {
        const customServerSchema = z.looseObject({
            requiredProp: z.string(),
        });

        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            schema: { serverCapability: customServerSchema },
        });

        const capabilities = {
            [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
            [CUSTOM_URI]: { requiredProp: 123 }, // Invalid
        };

        await registry.validateServerCapabilities(capabilities);

        // Capabilities should be unchanged — validation is pure
        expect(capabilities[CUSTOM_URI]).toBeDefined();
    });

    it("returns empty array for capabilities without schemas", async () => {
        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            // No schema
        });

        const results = await registry.validateServerCapabilities({
            [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
            [CUSTOM_URI]: { anything: "goes" },
        });

        expect(results).toEqual([]);
    });

    it("skips validation when the capability URI is not in the capabilities", async () => {
        const customServerSchema = z.looseObject({
            required: z.string(),
        });

        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            schema: { serverCapability: customServerSchema },
        });

        // Capabilities do NOT include CUSTOM_URI
        const results = await registry.validateServerCapabilities({
            [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
        });

        expect(results).toEqual([]);
    });

    it("formats error without path prefix when issue has no path", async () => {
        const customSchema: StandardSchemaV1 = {
            "~standard": {
                version: 1,
                vendor: "test",
                validate() {
                    return {
                        issues: [{ message: "value is invalid" }],
                    };
                },
            },
        };

        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            schema: { serverCapability: customSchema },
        });

        const results = await registry.validateServerCapabilities({
            [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
            [CUSTOM_URI]: { anything: "goes" },
        });

        expect(results).toHaveLength(1);
        expect(results[0]?.valid).toBe(false);
        if (results[0]?.valid === false) {
            expect(results[0].errors[0]?.message).toBe("value is invalid");
        }
    });

    it("formats error with path prefix when issue has object path segments", async () => {
        const customSchema: StandardSchemaV1 = {
            "~standard": {
                version: 1,
                vendor: "test",
                validate() {
                    return {
                        issues: [{ message: "must be a number", path: [{ key: "items" }, { key: 0 }] }],
                    };
                },
            },
        };

        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            schema: { serverCapability: customSchema },
        });

        const results = await registry.validateServerCapabilities({
            [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
            [CUSTOM_URI]: { items: ["not-a-number"] },
        });

        expect(results).toHaveLength(1);
        expect(results[0]?.valid).toBe(false);
        if (results[0]?.valid === false) {
            expect(results[0].errors[0]?.message).toBe("items.0: must be a number");
        }
    });

    it("validates a third-party capability using a custom StandardSchema", async () => {
        const customSchema: StandardSchemaV1 = {
            "~standard": {
                version: 1,
                vendor: "test",
                validate(value) {
                    const obj = value as Record<string, unknown>;
                    if (typeof obj["requiredProp"] !== "string") {
                        return {
                            issues: [{ message: "requiredProp must be a string", path: ["requiredProp"] }],
                        };
                    }
                    return { value: obj };
                },
            },
        };

        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            schema: { serverCapability: customSchema },
        });

        // Invalid data
        const results = await registry.validateServerCapabilities({
            [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
            [CUSTOM_URI]: { requiredProp: 123 },
        });

        expect(results).toHaveLength(1);
        expect(results[0]?.uri).toBe(CUSTOM_URI);
        expect(results[0]?.valid).toBe(false);

        // Valid data
        const validResults = await registry.validateServerCapabilities({
            [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES,
            [CUSTOM_URI]: { requiredProp: "hello" },
        });

        expect(validResults).toEqual([{ valid: true, uri: CUSTOM_URI }]);
    });
});

describe("CapabilityRegistry.validateAccountCapabilities", () => {
    const mockClientContext = createMockClientContext();

    it("reports valid result when account capability data is valid", async () => {
        const customAccountSchema = z.looseObject({
            maxDelayedSend: z.number().int().min(0),
        });

        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            schema: { accountCapability: customAccountSchema },
        });

        const results = await registry.validateAccountCapabilities({
            acc1: {
                accountCapabilities: {
                    [CORE_CAPABILITY_URI]: {},
                    [CUSTOM_URI]: { maxDelayedSend: 100 },
                },
            },
        });

        expect(results).toEqual([{ valid: true, uri: CUSTOM_URI, accountId: "acc1" }]);
    });

    it("returns a failure for an invalid account capability", async () => {
        const customAccountSchema = z.looseObject({
            maxDelayedSend: z.number().int().min(0),
        });

        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            schema: { accountCapability: customAccountSchema },
        });

        const results = await registry.validateAccountCapabilities({
            acc1: {
                accountCapabilities: {
                    [CORE_CAPABILITY_URI]: {},
                    [CUSTOM_URI]: { maxDelayedSend: "not-a-number" }, // Invalid
                },
            },
        });

        expect(results).toHaveLength(1);
        expect(results[0]?.uri).toBe(CUSTOM_URI);
        expect(results[0]?.accountId).toBe("acc1");
        expect(results[0]?.valid).toBe(false);
        if (results[0]?.valid === false) {
            expect(results[0].errors.length).toBeGreaterThan(0);
        }
    });

    it("does not mutate the accounts object", async () => {
        const customAccountSchema = z.looseObject({
            maxDelayedSend: z.number().int().min(0),
        });

        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            schema: { accountCapability: customAccountSchema },
        });

        const accounts = {
            acc1: {
                accountCapabilities: {
                    [CORE_CAPABILITY_URI]: {},
                    [CUSTOM_URI]: { maxDelayedSend: "not-a-number" }, // Invalid
                },
            },
        };

        await registry.validateAccountCapabilities(accounts);

        // Accounts should be unchanged — validation is pure
        expect(accounts.acc1.accountCapabilities[CUSTOM_URI]).toBeDefined();
    });

    it("reports failures per account independently", async () => {
        const customAccountSchema = z.looseObject({
            limit: z.number().int().min(1),
        });

        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            schema: { accountCapability: customAccountSchema },
        });

        const results = await registry.validateAccountCapabilities({
            acc1: {
                accountCapabilities: {
                    [CORE_CAPABILITY_URI]: {},
                    [CUSTOM_URI]: { limit: 10 }, // Valid
                },
            },
            acc2: {
                accountCapabilities: {
                    [CORE_CAPABILITY_URI]: {},
                    [CUSTOM_URI]: { limit: -1 }, // Invalid: min 1
                },
            },
        });

        expect(results).toHaveLength(2);
        const failures = results.filter((r) => !r.valid);
        expect(failures).toHaveLength(1);
        expect(failures[0]?.accountId).toBe("acc2");
    });

    it("skips accounts that do not have the capability", async () => {
        const customAccountSchema = z.looseObject({
            required: z.string(),
        });

        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);
        registry.register({
            uri: CUSTOM_URI,
            invocations: {},
            schema: { accountCapability: customAccountSchema },
        });

        // Account does NOT include CUSTOM_URI
        const results = await registry.validateAccountCapabilities({
            acc1: {
                accountCapabilities: {
                    [CORE_CAPABILITY_URI]: {},
                },
            },
        });

        expect(results).toEqual([]);
    });
});

describe("CapabilityRegistry.validateCapabilityDefinition", () => {
    const mockClientContext = createMockClientContext();

    it("returns empty failure arrays when data is valid", async () => {
        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);

        const capability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
            schema: {
                serverCapability: z.looseObject({ maxItems: z.number().int().min(0) }),
                accountCapability: z.looseObject({ limit: z.number().int().min(1) }),
            },
        };

        const result = await registry.validateCapabilityDefinition(
            capability,
            { [CUSTOM_URI]: { maxItems: 100 } },
            { acc1: { accountCapabilities: { [CUSTOM_URI]: { limit: 50 } } } },
        );

        expect(result.serverCapabilities).toEqual([]);
        expect(result.accountCapabilities).toEqual([]);
    });

    it("returns server failure when server capability data is invalid", async () => {
        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);

        const capability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
            schema: {
                serverCapability: z.looseObject({ maxItems: z.number().int().min(0) }),
            },
        };

        const result = await registry.validateCapabilityDefinition(
            capability,
            { [CUSTOM_URI]: { maxItems: "not-a-number" } },
            {},
        );

        expect(result.serverCapabilities).toHaveLength(1);
        expect(result.serverCapabilities[0]?.uri).toBe(CUSTOM_URI);
        expect(result.serverCapabilities[0]?.valid).toBe(false);
        expect(result.accountCapabilities).toEqual([]);
    });

    it("returns account failure when account capability data is invalid", async () => {
        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);

        const capability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
            schema: {
                accountCapability: z.looseObject({ limit: z.number().int().min(1) }),
            },
        };

        const result = await registry.validateCapabilityDefinition(
            capability,
            {},
            { acc1: { accountCapabilities: { [CUSTOM_URI]: { limit: -5 } } } },
        );

        expect(result.serverCapabilities).toEqual([]);
        expect(result.accountCapabilities).toHaveLength(1);
        expect(result.accountCapabilities[0]?.uri).toBe(CUSTOM_URI);
        expect(result.accountCapabilities[0]?.accountId).toBe("acc1");
        expect(result.accountCapabilities[0]?.valid).toBe(false);
    });

    it("returns empty failure arrays when capability has no schema", async () => {
        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);

        const capability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
        };

        const result = await registry.validateCapabilityDefinition(
            capability,
            { [CUSTOM_URI]: { anything: "goes" } },
            { acc1: { accountCapabilities: { [CUSTOM_URI]: { whatever: true } } } },
        );

        expect(result.serverCapabilities).toEqual([]);
        expect(result.accountCapabilities).toEqual([]);
    });

    it("returns empty failure arrays when URI is not present in session data", async () => {
        const registry = new CapabilityRegistry(createCoreCapabilityDef(), mockClientContext);

        const capability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
            schema: {
                serverCapability: z.looseObject({ required: z.string() }),
                accountCapability: z.looseObject({ required: z.string() }),
            },
        };

        // Session data does not include CUSTOM_URI at all
        const result = await registry.validateCapabilityDefinition(
            capability,
            { [CORE_CAPABILITY_URI]: CORE_SERVER_CAPABILITIES },
            { acc1: { accountCapabilities: { [CORE_CAPABILITY_URI]: {} } } },
        );

        expect(result.serverCapabilities).toEqual([]);
        expect(result.accountCapabilities).toEqual([]);
    });
});
