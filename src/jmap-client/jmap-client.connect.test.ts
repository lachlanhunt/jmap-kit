import { z } from "zod/v4";
import { EmailCapability } from "../capabilities/email-capability.js";
import type { CapabilityDefinition } from "../capability-registry/types.js";
import type { JMAPCapability } from "../common/types.js";
import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockLogger, createMockTransport, expectURL } from "./test-utils.js";

describe("JMAPClient connection", () => {
    it("should construct a JMAP client", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
        });
        expect(client).toBeInstanceOf(JMAPClient);
        expect(client).toHaveProperty("connect");
    });

    it("should connect to the JMAP server", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
            headers: {
                "X-Foo": "bar",
            },
        });
        await client.connect();

        expect(transport.get).toHaveBeenCalledWith(
            new URL("https://api.example.com/.well-known/jmap"),
            expect.objectContaining({
                headers: expect.toHaveHeaders({
                    "X-Foo": "bar",
                }),
                signal: expect.any(AbortSignal),
                responseType: "json",
            }),
        );
        expect(client.connectionStatus).toBe("connected");
    });

    it("should only attempt to connect to the JMAP server once", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
            headers: {
                "X-Foo": "bar",
            },
        });
        await Promise.all([client.connect(), client.connect()]);

        expect(transport.get).toHaveBeenCalledOnce();
    });

    it("should throw an error if connecting without a hostname", async () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            port: 443,
        });
        await expect(client.connect()).rejects.toThrow("Cannot connect to JMAP server without a hostname");
    });

    it("should throw an error if the transport fails to connect", async () => {
        const transport = createMockTransport();
        transport.get.mockRejectedValueOnce(new Error("Transport error"));
        const logger = createMockLogger();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            logger,
        });

        const connectPromise = client.connect();
        await expect(connectPromise).rejects.toThrow("Transport error");

        expect(logger.warn).toHaveBeenCalledWith(
            "JMAP Client is disconnecting due to a transport error",
            expect.objectContaining({ error: expect.any(Error) }),
        );
        expect(logger.error).toHaveBeenCalledWith(
            "JMAP Client disconnected due to a transport error",
            expect.objectContaining({ error: expect.any(Error) }),
        );
    });

    it("should throw an error if changing hostname after connecting", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
        });
        await client.connect();
        expect(() => client.withHostname("example.com")).toThrow(
            "Cannot change hostname after connecting to a JMAP server",
        );
    });

    it("should allow withHostname to change the hostname", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "example.com",
            port: 443,
        }).withHostname("api.example.com");

        await client.connect();

        expect(transport.get).toHaveBeenCalled();
        expectURL(transport.get.mock.lastCall?.[0]);
        expect(transport.get.mock.lastCall[0].hostname).toBe("api.example.com");
    });

    it("should throw an error if changing port after connecting", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
        });
        await client.connect();
        expect(() => client.withPort(80)).toThrow("Cannot change port after connecting to a JMAP server");
    });

    it("should allow withPort to change the port", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
        }).withPort(80);

        await client.connect();

        expect(transport.get).toHaveBeenCalled();
        expectURL(transport.get.mock.lastCall?.[0]);
        expect(transport.get.mock.lastCall[0].port).toBe("80");
    });

    it("should allow withHeaders to append additional headers", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
            headers: {
                "X-Foo": "bar",
            },
        }).withHeaders({ "X-Bar": "baz" });

        await client.connect();

        expect(transport.get).toHaveBeenCalledWith(
            expect.any(URL),
            expect.objectContaining({
                headers: expect.toHaveHeaders({
                    "X-Foo": "bar",
                    "X-Bar": "baz",
                }),
            }),
        );
    });

    it("should allow withHeaders to override existing headers", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
            headers: {
                "X-Foo": "bar",
            },
        }).withHeaders({ "X-Foo": "baz" });

        await client.connect();

        const headerValue = transport.get.mock.calls[0]?.[1]?.headers?.get("X-Foo");
        expect(headerValue).toBe("bar, baz");
        expect(transport.get).toHaveBeenCalledWith(
            expect.any(URL),
            expect.objectContaining({
                headers: expect.toHaveHeaders({
                    "X-Foo": "bar, baz",
                }),
                signal: expect.any(AbortSignal),
                responseType: "json",
            }),
        );
    });

    it("should throw when Core capability validation fails during connect", async () => {
        const invalidSession = {
            ...mockSession,
            capabilities: {
                ...mockSession.capabilities,
                "urn:ietf:params:jmap:core": {
                    ...mockSession.capabilities["urn:ietf:params:jmap:core"],
                    maxSizeUpload: "not-a-number",
                },
            },
        };
        const transport = createMockTransport({ getResponse: invalidSession });
        const logger = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api.example.com", logger });

        await expect(client.connect()).rejects.toThrow("Core server capability validation failed");
    });

    it("should strip invalid non-Core capabilities and emit invalid-capabilities during connect", async () => {
        const CUSTOM_URI = "https://example.com/jmap/custom" as JMAPCapability;
        const sessionWithInvalid = {
            ...mockSession,
            capabilities: {
                ...mockSession.capabilities,
                [CUSTOM_URI]: { maxItems: "not-a-number" },
            },
            accounts: {
                ...mockSession.accounts,
                u0b5a3998: {
                    ...mockSession.accounts.u0b5a3998,
                    accountCapabilities: {
                        ...mockSession.accounts.u0b5a3998.accountCapabilities,
                        "urn:ietf:params:jmap:mail": {
                            ...mockSession.accounts.u0b5a3998.accountCapabilities["urn:ietf:params:jmap:mail"],
                            maxSizeMailboxName: "not-a-number",
                        },
                    },
                },
            },
        };
        const transport = createMockTransport({ getResponse: sessionWithInvalid });
        const emitter = vi.fn();
        const logger = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api.example.com", emitter, logger });

        // Register capabilities before connecting so schemas are used for validation
        await client.registerCapabilities(EmailCapability);
        const customCapability: CapabilityDefinition = {
            uri: CUSTOM_URI,
            invocations: {},
            schema: {
                serverCapability: z.looseObject({ maxItems: z.number().int().min(0) }),
            },
        };
        await client.registerCapabilities(customCapability);

        await client.connect();

        // Connection should succeed but emit invalid-capabilities for both server and account failures
        expect(client.connectionStatus).toBe("connected");
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("Stripping server capability"),
            // no second arg for this logger call
        );
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("Stripping account capability"),
            // no second arg for this logger call
        );
        expect(emitter).toHaveBeenCalledWith(
            "invalid-capabilities",
            expect.objectContaining({
                context: "connection",
                serverCapabilities: expect.arrayContaining([expect.objectContaining({ uri: CUSTOM_URI })]),
                accountCapabilities: expect.arrayContaining([
                    expect.objectContaining({ uri: "urn:ietf:params:jmap:mail", accountId: "u0b5a3998" }),
                ]),
            }),
        );
    });

    it("should clear session and set status to disconnected on disconnect", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        await client.connect();
        await client.disconnect();
        expect(client.connectionStatus).toBe("disconnected");
        expect(client.serverCapabilities).toBe(null);
        expect(client.accounts).toBe(null);
    });
});
