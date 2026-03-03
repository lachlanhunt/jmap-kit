import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import { EmailCapability } from "../capabilities/email-capability.js";
import { CORE_CAPABILITY_URI, EMAIL_CAPABILITY_URI } from "../common/registry.js";
import type { JMAPCapability } from "../common/types.js";
import type { CapabilityDefinition } from "../capability-registry/types.js";
import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockLogger, createMockTransport } from "./test-utils.js";

const CUSTOM_URI = "https://example.com/jmap/custom" as JMAPCapability;

describe("JMAPClient capability registry integration", () => {
    it("should return a promise from registerCapabilities", async () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });

        const result = client.registerCapabilities(EmailCapability);

        expect(result).toBeInstanceOf(Promise);
        await result;
    });

    it("should have the Core capability registered by default", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });

        // Verify Core capability is registered
        expect(client.capabilityRegistry.has(CORE_CAPABILITY_URI)).toBe(true);
        const coreCapability = client.capabilityRegistry.get(CORE_CAPABILITY_URI);
        expect(coreCapability).toBeDefined();
        expect(coreCapability?.uri).toBe(CORE_CAPABILITY_URI);
    });

    it("should register a single capability correctly", async () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });

        // Verify Email capability is not registered initially
        expect(client.capabilityRegistry.has(EMAIL_CAPABILITY_URI)).toBe(false);

        // Register the Email capability
        await client.registerCapabilities(EmailCapability);

        // Verify Email capability is now registered
        expect(client.capabilityRegistry.has(EMAIL_CAPABILITY_URI)).toBe(true);
        const emailCapability = client.capabilityRegistry.get(EMAIL_CAPABILITY_URI);
        expect(emailCapability).toBeDefined();
        expect(emailCapability?.uri).toBe(EMAIL_CAPABILITY_URI);
    });

    it("should register multiple capabilities at once", async () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });

        // Create a mock capability for testing multiple registrations
        const mockCapability = {
            uri: "urn:test:mock" as JMAPCapability,
            invocations: {},
        };

        // Register both Email and mock capabilities at once
        await client.registerCapabilities(EmailCapability, mockCapability);

        // Verify both capabilities are registered
        expect(client.capabilityRegistry.has(EMAIL_CAPABILITY_URI)).toBe(true);
        expect(client.capabilityRegistry.has("urn:test:mock")).toBe(true);
    });

    it("should log correctly when registering capabilities", async () => {
        const mockLogger = createMockLogger();

        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            logger: mockLogger,
        });

        // First registration should be successful and log an info message
        await client.registerCapabilities(EmailCapability);
        expect(mockLogger.info).toHaveBeenCalledWith(`Successfully registered capability: ${EMAIL_CAPABILITY_URI}`);
        mockLogger.info.mockClear();

        // Second registration attempt should log a debug message since capability is already registered
        await client.registerCapabilities(EmailCapability);
        expect(mockLogger.info).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(`Capability already registered: ${EMAIL_CAPABILITY_URI}`);
    });
});

describe("JMAPClient late capability registration", () => {
    it("should register after connection with valid data and return empty failure arrays", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const emitter = vi.fn();
        const client = new JMAPClient(transport, { hostname: "api.example.com", emitter });
        await client.connect();

        // The mock session doesn't include CUSTOM_URI in capabilities,
        // so use a capability without schema to test the happy path.
        const noSchemaCapability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
        };

        const result = await client.registerCapabilities(noSchemaCapability);

        expect(result.serverCapabilities).toEqual([]);
        expect(result.accountCapabilities).toEqual([]);
        expect(client.capabilityRegistry.has(CUSTOM_URI)).toBe(true);
        expect(emitter).not.toHaveBeenCalledWith("invalid-capabilities", expect.anything());
    });

    it("should register after connection when schema validates successfully", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const emitter = vi.fn();
        const client = new JMAPClient(transport, { hostname: "api.example.com", emitter });
        await client.connect();

        // The mock session has valid Email account capability data,
        // so EmailCapability (which has an accountCapability schema) should validate and register.
        const { EmailCapability } = await import("../capabilities/email-capability.js");
        const result = await client.registerCapabilities(EmailCapability);

        expect(result.serverCapabilities).toEqual([]);
        expect(result.accountCapabilities).toEqual([]);
        expect(client.capabilityRegistry.has(EMAIL_CAPABILITY_URI)).toBe(true);
        expect(emitter).not.toHaveBeenCalledWith("invalid-capabilities", expect.anything());
    });

    it("should reject after connection when server capability data is invalid", async () => {
        // Create a session with the custom capability present but with invalid data
        const sessionWithCustom = {
            ...mockSession,
            capabilities: {
                ...mockSession.capabilities,
                [CUSTOM_URI]: { maxItems: "not-a-number" },
            },
        };
        const transport = createMockTransport({ getResponse: sessionWithCustom });
        const emitter = vi.fn();
        const client = new JMAPClient(transport, { hostname: "api.example.com", emitter });
        await client.connect();

        emitter.mockClear(); // Clear connection events

        const capability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
            schema: {
                serverCapability: z.looseObject({ maxItems: z.number().int().min(0) }),
            },
        };

        const result = await client.registerCapabilities(capability);

        expect(result.serverCapabilities).toHaveLength(1);
        expect(result.serverCapabilities[0]?.uri).toBe(CUSTOM_URI);
        expect(result.accountCapabilities).toEqual([]);
        expect(client.capabilityRegistry.has(CUSTOM_URI)).toBe(false);
        expect(emitter).toHaveBeenCalledWith(
            "invalid-capabilities",
            expect.objectContaining({
                context: "registration",
                serverCapabilities: expect.arrayContaining([expect.objectContaining({ uri: CUSTOM_URI })]),
            }),
        );
    });

    it("should reject after connection when account capability data is invalid", async () => {
        const sessionWithCustom = {
            ...mockSession,
            accounts: {
                ...mockSession.accounts,
                u0b5a3998: {
                    ...mockSession.accounts.u0b5a3998,
                    accountCapabilities: {
                        ...mockSession.accounts.u0b5a3998.accountCapabilities,
                        [CUSTOM_URI]: { limit: "invalid" },
                    },
                },
            },
        };
        const transport = createMockTransport({ getResponse: sessionWithCustom });
        const emitter = vi.fn();
        const client = new JMAPClient(transport, { hostname: "api.example.com", emitter });
        await client.connect();

        emitter.mockClear();

        const capability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
            schema: {
                accountCapability: z.looseObject({ limit: z.number().int().min(1) }),
            },
        };

        const result = await client.registerCapabilities(capability);

        expect(result.accountCapabilities).toHaveLength(1);
        expect(result.accountCapabilities[0]?.uri).toBe(CUSTOM_URI);
        expect(result.accountCapabilities[0]?.accountId).toBe("u0b5a3998");
        expect(client.capabilityRegistry.has(CUSTOM_URI)).toBe(false);
        expect(emitter).toHaveBeenCalledWith(
            "invalid-capabilities",
            expect.objectContaining({
                context: "registration",
                accountCapabilities: expect.arrayContaining([
                    expect.objectContaining({ uri: CUSTOM_URI, accountId: "u0b5a3998" }),
                ]),
            }),
        );
    });

    it("should register after connection without validation when capability has no schema", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        await client.connect();

        const capability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
            // No schema
        };

        const result = await client.registerCapabilities(capability);

        expect(result.serverCapabilities).toEqual([]);
        expect(result.accountCapabilities).toEqual([]);
        expect(client.capabilityRegistry.has(CUSTOM_URI)).toBe(true);
    });

    it("should skip already-registered capability without validation", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const mockLogger = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api.example.com", logger: mockLogger });
        await client.connect();

        // Register once
        await client.registerCapabilities({ uri: CUSTOM_URI, invocations: {} });
        expect(client.capabilityRegistry.has(CUSTOM_URI)).toBe(true);

        mockLogger.info.mockClear();

        // Register again — should skip
        const result = await client.registerCapabilities({ uri: CUSTOM_URI, invocations: {} });

        expect(result.serverCapabilities).toEqual([]);
        expect(result.accountCapabilities).toEqual([]);
        expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining("Successfully registered"));
    });

    it("should register valid capabilities and reject invalid ones in a single call", async () => {
        const sessionWithCustom = {
            ...mockSession,
            capabilities: {
                ...mockSession.capabilities,
                [CUSTOM_URI]: { maxItems: "not-a-number" },
            },
        };
        const transport = createMockTransport({ getResponse: sessionWithCustom });
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        await client.connect();

        const validCapability: CapabilityDefinition = {
            uri: "urn:test:valid" as JMAPCapability,
            invocations: {},
        };
        const invalidCapability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
            schema: {
                serverCapability: z.looseObject({ maxItems: z.number() }),
            },
        };

        const result = await client.registerCapabilities(validCapability, invalidCapability);

        expect(client.capabilityRegistry.has("urn:test:valid")).toBe(true);
        expect(client.capabilityRegistry.has(CUSTOM_URI)).toBe(false);
        expect(result.serverCapabilities).toHaveLength(1);
        expect(result.serverCapabilities[0]?.uri).toBe(CUSTOM_URI);
    });

    it("should register before connection without validation", async () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api.example.com" });

        const capability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
            schema: {
                // Schema is present, but no validation should happen because client is not connected
                serverCapability: z.looseObject({ required: z.string() }),
            },
        };

        const result = await client.registerCapabilities(capability);

        expect(result.serverCapabilities).toEqual([]);
        expect(result.accountCapabilities).toEqual([]);
        expect(client.capabilityRegistry.has(CUSTOM_URI)).toBe(true);
    });

    it("should wait for connection to complete before validating when connecting", async () => {
        const deferred = Promise.withResolvers<unknown>();
        const transport = createMockTransport();
        transport.get.mockReturnValue(deferred.promise);

        const client = new JMAPClient(transport, { hostname: "api.example.com" });

        // Start connecting (will hang on transport.get)
        const connectPromise = client.connect();

        const capability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
        };

        // Register while connecting — should wait for connection
        const registerPromise = client.registerCapabilities(capability);

        // Now resolve the connection
        deferred.resolve(mockSession);
        await connectPromise;

        const result = await registerPromise;

        expect(result.serverCapabilities).toEqual([]);
        expect(result.accountCapabilities).toEqual([]);
        expect(client.capabilityRegistry.has(CUSTOM_URI)).toBe(true);
    });

    it("should register without validation when connection fails during connecting", async () => {
        const transport = createMockTransport();
        transport.get.mockRejectedValue(new Error("Connection failed"));

        const client = new JMAPClient(transport, { hostname: "api.example.com" });

        // Start connecting (will fail)
        const connectPromise = client.connect();

        const capability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
            schema: {
                serverCapability: z.looseObject({ required: z.string() }),
            },
        };

        // Register while connecting — connection will fail, so should register without validation
        const registerPromise = client.registerCapabilities(capability);

        await expect(connectPromise).rejects.toThrow("Connection failed");

        const result = await registerPromise;

        expect(result.serverCapabilities).toEqual([]);
        expect(result.accountCapabilities).toEqual([]);
        expect(client.capabilityRegistry.has(CUSTOM_URI)).toBe(true);
    });
});
