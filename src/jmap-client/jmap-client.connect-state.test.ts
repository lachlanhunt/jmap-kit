import { describe, expect, it } from "vitest";
import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockAbortableTransport, createMockLogger, createMockTransport, makeAbortError } from "./test-utils.js";
import type { JMAPSession } from "./types.js";

describe("JMAPClient state consistency", () => {
    it("should not retain session data if disconnect is called during connect", async () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api" });

        // Patch transport.get to delay so we can call disconnect during connect
        const { promise: getPromise, resolve: resolveGet } = Promise.withResolvers<JMAPSession>();
        transport.get.mockImplementation(() => getPromise);

        const connectPromise = client.connect();
        // Simulate disconnect being called while connect is in progress
        await Promise.resolve(); // let connect start
        const disconnectPromise = client.disconnect();
        resolveGet(mockSession);
        await connectPromise;
        await disconnectPromise;
        // Use public API to check state instead of private fields
        expect(client.connectionStatus).toBe("disconnected");
        expect(client.serverCapabilities).toBeNull();
        expect(client.accounts).toBeNull();
        expect(client.primaryAccounts).toEqual({});
        expect(client.username).toBe("");
        expect(client.apiUrl).toBe("");
        expect(client.downloadUrl).toBe("");
        expect(client.uploadUrl).toBe("");
        expect(client.eventSourceUrl).toBe("");
    });

    it("should handle AbortError thrown by transport.get when aborted during connect", async () => {
        const transport = createMockAbortableTransport();
        const logger = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api", logger });

        // Use an AbortController to abort the request
        const controller = new AbortController();
        const connectPromise = client.connect(controller.signal);
        controller.abort();

        await expect(connectPromise).rejects.toThrow(makeAbortError());

        expect(logger.warn).toHaveBeenCalledWith("JMAP Client is disconnecting due to connection being aborted", {
            error: expect.objectContaining(makeAbortError()),
        });

        expect(logger.error).toHaveBeenCalledWith("JMAP Client disconnected due to connection being aborted", {
            error: expect.objectContaining(makeAbortError()),
        });

        // After abort, client should be disconnected and have no session data
        expect(client.connectionStatus).toBe("disconnected");
        expect(client.serverCapabilities).toBeNull();
        expect(client.accounts).toBeNull();
        expect(client.primaryAccounts).toEqual({});
        expect(client.username).toBe("");
        expect(client.apiUrl).toBe("");
        expect(client.downloadUrl).toBe("");
        expect(client.uploadUrl).toBe("");
        expect(client.eventSourceUrl).toBe("");
    });

    it("should allow connect() after disconnect() completes and reinitialise session", async () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api" });
        // First connect
        const { promise: getPromise1, resolve: resolveGet1 } = Promise.withResolvers<JMAPSession>();
        transport.get.mockImplementation(() => getPromise1);
        const connectPromise1 = client.connect();
        resolveGet1(mockSession);
        await connectPromise1;
        expect(client.connectionStatus).toBe("connected");
        await client.disconnect();
        expect(client.connectionStatus).toBe("disconnected");
        // Second connect
        const { promise: getPromise2, resolve: resolveGet2 } = Promise.withResolvers<JMAPSession>();
        transport.get.mockImplementation(() => getPromise2);
        const connectPromise2 = client.connect();
        resolveGet2({
            ...mockSession,
            username: "user2",
        });
        await connectPromise2;
        expect(client.connectionStatus).toBe("connected");
        expect(client.username).toBe("user2");
    });

    it("should allow connect() after a failed connect and reinitialise session", async () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api" });
        // First connect fails
        transport.get.mockImplementation(() => Promise.reject(new Error("fail connect")));
        await expect(client.connect()).rejects.toThrow("fail connect");
        expect(client.connectionStatus).toBe("disconnected");
        // Second connect succeeds
        const { promise: getPromise, resolve: resolveGet } = Promise.withResolvers<JMAPSession>();
        transport.get.mockImplementation(() => getPromise);
        const connectPromise = client.connect();
        resolveGet({
            ...mockSession,
            username: "user1",
        });
        await connectPromise;
        expect(client.connectionStatus).toBe("connected");
        expect(client.username).toBe("user1");
        // Confirm reinitialisation after failed connect
    });

    it("should be a no-op to call disconnect() while already disconnected", async () => {
        const transport = createMockTransport();
        const logger = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api", logger });
        await client.disconnect();
        expect(client.connectionStatus).toBe("disconnected");
        expect(logger.debug).toHaveBeenCalledWith("JMAP Client is already disconnected");
    });

    it("should not transition to connected if disconnect() is called just before session is set", async () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api" });
        // Patch transport.get to delay so we can call disconnect right before session assignment
        const { promise: getPromise, resolve: resolveGet } = Promise.withResolvers<JMAPSession>();
        transport.get.mockImplementation(() => getPromise);
        const connectPromise = client.connect();
        await Promise.resolve(); // let connect start
        const disconnectPromise = client.disconnect();
        resolveGet({
            ...mockSession,
            username: "user",
        });
        await connectPromise;
        await disconnectPromise;
        expect(client.connectionStatus).toBe("disconnected");
        expect(client.serverCapabilities).toBeNull();
    });

    it("should log correct sequence for concurrent connect/disconnect calls", async () => {
        const transport = createMockTransport();
        const logger = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api", logger });

        // Patch transport.get to delay so we can interleave connect/disconnect
        const { promise: getPromise, resolve: resolveGet } = Promise.withResolvers<JMAPSession>();
        transport.get.mockImplementation(() => getPromise);

        const connectPromise = client.connect();
        await Promise.resolve(); // let connect start
        const disconnectPromise = client.disconnect();
        resolveGet(mockSession);
        await connectPromise;
        await disconnectPromise;
        // Check logger calls for connection/disconnection sequence
        const infoCalls = logger.info.mock.calls.map((args) => args[0]);
        const warnCalls = logger.warn.mock.calls.map((args) => args[0]);
        expect(infoCalls.some((msg) => msg.includes("connecting"))).toBe(true);
        expect(infoCalls.some((msg) => msg.includes("disconnected"))).toBe(true);
        expect(warnCalls.some((msg) => msg.includes("interrupted"))).toBe(true);
    });

    it("should be idempotent when connect() is called multiple times concurrently", async () => {
        const transport = createMockTransport();
        const logger = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api", logger });

        // Patch transport.get to delay so we can trigger concurrent connect calls
        const { promise: getPromise, resolve: resolveGet } = Promise.withResolvers<JMAPSession>();
        transport.get.mockImplementation(() => getPromise);

        // Start first connect
        const connectPromise1 = client.connect();
        // Start second connect before the first resolves

        expect(logger.debug).not.toHaveBeenCalledWith("JMAP Client is already connecting, returning existing promise");

        const connectPromise2 = client.connect();

        // Check that the debug log for idempotency was called
        expect(logger.debug).toHaveBeenCalledWith("JMAP Client is already connecting, returning existing promise");

        // Only the first should trigger the actual connection
        resolveGet(mockSession);
        await Promise.all([connectPromise1, connectPromise2]);

        expect(client.connectionStatus).toBe("connected");
    });

    it("should throw if connect() is called while disconnecting", async () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api" });
        // Patch transport.get to delay so we can control when it resolves
        const { promise: getPromise, resolve: resolveGet } = Promise.withResolvers<JMAPSession>();
        transport.get.mockImplementation(() => getPromise);

        // Start connecting (connection is now in progress)
        const connectPromise = client.connect();
        await Promise.resolve(); // let connect start

        // Start disconnecting while connect is still in progress
        const disconnectPromise = client.disconnect();
        await Promise.resolve(); // let disconnect start and set state to disconnecting

        // Now, while disconnecting is in progress, try to connect again
        await expect(client.connect()).rejects.toThrow("Cannot reconnect while disconnecting");

        // Clean up: resolve the original getPromise so disconnect can finish
        resolveGet({
            ...mockSession,
        });
        await Promise.all([connectPromise, disconnectPromise]);
    });

    it("should be idempotent when disconnect() is called multiple times concurrently", async () => {
        const transport = createMockTransport();
        const logger = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api", logger });
        // Patch transport.get to delay so we can control when it resolves
        const { promise: getPromise, resolve: resolveGet } = Promise.withResolvers<JMAPSession>();
        transport.get.mockImplementation(() => getPromise);

        // Start connecting (connection is now in progress)
        const connectPromise = client.connect();
        await Promise.resolve(); // let connect start

        // Start disconnecting while connect is still in progress
        const disconnectPromise = client.disconnect();

        // Now, while disconnecting is in progress, try to disconnect again
        void client.disconnect();

        // Check that the debug log for idempotency was called
        expect(logger.debug).toHaveBeenCalledWith("JMAP Client is already disconnecting, returning existing promise");

        // Clean up: resolve the original getPromise so disconnect can finish
        resolveGet({
            ...mockSession,
        });
        await Promise.all([connectPromise, disconnectPromise]);
    });

    it("should throw and log correct messages when the session response is invalid", async () => {
        const transport = createMockTransport({ getResponse: { ...mockSession, username: 123 } });
        const logger = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api", logger });

        await expect(client.connect()).rejects.toThrow("Invalid JMAP session response");

        expect(logger.warn).toHaveBeenCalledWith(
            "JMAP Client is disconnecting due to an invalid session response",
            expect.objectContaining({ error: expect.any(Error) }),
        );
        expect(logger.error).toHaveBeenCalledWith(
            "JMAP Client disconnected due to an invalid session response",
            expect.objectContaining({ error: expect.any(Error) }),
        );

        expect(client.connectionStatus).toBe("disconnected");
        expect(client.serverCapabilities).toBeNull();
        expect(client.accounts).toBeNull();
        expect(client.primaryAccounts).toEqual({});
        expect(client.username).toBe("");
        expect(client.apiUrl).toBe("");
        expect(client.downloadUrl).toBe("");
        expect(client.uploadUrl).toBe("");
        expect(client.eventSourceUrl).toBe("");
    });
});
