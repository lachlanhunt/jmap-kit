import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createEchoRequestAndResponse, createMockLogger, createMockTransport } from "./test-utils.js";

describe("JMAPClient auto-reconnect", () => {
    it("should not trigger reconnection by default when session becomes stale", async () => {
        const { mockRequest, postResponse } = createEchoRequestAndResponse("DIFFERENT-STATE");
        const transport = createMockTransport({ getResponse: mockSession, postResponse });
        const logger = createMockLogger();
        const emitter = vi.fn();

        const client = new JMAPClient(transport, { hostname: "api.example.com", logger, emitter });
        await client.connect();

        // Reset the transport.get mock to track reconnection attempts
        transport.get.mockClear();

        await client.sendAPIRequest(mockRequest);

        expect(logger.warn).toHaveBeenCalledWith(
            "JMAP Server session state has changed; client may be out of sync. Reconnection recommended.",
        );
        expect(emitter).toHaveBeenCalledWith("session-stale", expect.any(Object));
        // No reconnection attempt
        expect(transport.get).not.toHaveBeenCalled();
    });

    it("should trigger connect() on stale session when autoReconnect is enabled via constructor", async () => {
        const { mockRequest, postResponse } = createEchoRequestAndResponse("DIFFERENT-STATE");
        const transport = createMockTransport({ getResponse: mockSession, postResponse });
        const logger = createMockLogger();
        const emitter = vi.fn();

        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            logger,
            emitter,
            autoReconnect: true,
        });
        await client.connect();

        // Reset the transport.get mock to track reconnection attempts
        transport.get.mockClear();

        const response = await client.sendAPIRequest(mockRequest);

        // The response is still returned normally
        expect(response).toHaveProperty("methodResponses");
        expect(response.sessionState).toBe("DIFFERENT-STATE");

        expect(logger.warn).toHaveBeenCalledWith(
            "JMAP Server session state has changed; reconnecting automatically.",
        );

        // Wait for the fire-and-forget connect() to settle
        await vi.waitFor(() => {
            expect(transport.get).toHaveBeenCalledTimes(1);
        });
    });

    it("should trigger connect() on stale session when autoReconnect is enabled via withAutoReconnect()", async () => {
        const { mockRequest, postResponse } = createEchoRequestAndResponse("DIFFERENT-STATE");
        const transport = createMockTransport({ getResponse: mockSession, postResponse });
        const logger = createMockLogger();

        const client = new JMAPClient(transport, { hostname: "api.example.com", logger });
        client.withAutoReconnect();
        await client.connect();

        transport.get.mockClear();

        await client.sendAPIRequest(mockRequest);

        await vi.waitFor(() => {
            expect(transport.get).toHaveBeenCalledTimes(1);
        });
    });

    it("should emit 'session-stale' event before reconnecting", async () => {
        const { mockRequest, postResponse } = createEchoRequestAndResponse("DIFFERENT-STATE");
        const transport = createMockTransport({ getResponse: mockSession, postResponse });
        const emitter = vi.fn();

        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            emitter,
            autoReconnect: true,
        });
        await client.connect();
        transport.get.mockClear();

        await client.sendAPIRequest(mockRequest);

        expect(emitter).toHaveBeenCalledWith("session-stale", {
            oldSessionState: mockSession.state,
            newSessionState: "DIFFERENT-STATE",
        });

        // Wait for reconnection to complete
        await vi.waitFor(() => {
            expect(transport.get).toHaveBeenCalledTimes(1);
        });

        // Verify session-stale was emitted before the reconnection status-changed events
        const sessionStaleIndex = emitter.mock.calls.findIndex(
            (call: unknown[]) => call[0] === "session-stale",
        );
        const reconnectingIndex = emitter.mock.calls.findIndex(
            (call: unknown[], i: number) =>
                i > sessionStaleIndex &&
                call[0] === "status-changed" &&
                (call[1] as { status: string }).status === "connecting",
        );
        expect(sessionStaleIndex).toBeGreaterThanOrEqual(0);
        expect(reconnectingIndex).toBeGreaterThan(sessionStaleIndex);
    });

    it("should coalesce concurrent staleness detections into one connect() call", async () => {
        const postResponse1 = createEchoRequestAndResponse("NEW-STATE-1");
        const postResponse2 = createEchoRequestAndResponse("NEW-STATE-2");
        const transport = createMockTransport({ getResponse: mockSession });
        // Each sendAPIRequest gets its own postResponse with a different state
        transport.post
            .mockResolvedValueOnce(postResponse1.postResponse)
            .mockResolvedValueOnce(postResponse2.postResponse);

        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            autoReconnect: true,
        });
        await client.connect();
        transport.get.mockClear();

        // Send two requests concurrently that both detect staleness
        const [response1, response2] = await Promise.all([
            client.sendAPIRequest(postResponse1.mockRequest),
            client.sendAPIRequest(postResponse2.mockRequest),
        ]);

        expect(response1).toHaveProperty("methodResponses");
        expect(response2).toHaveProperty("methodResponses");

        // Wait for reconnection to settle
        await vi.waitFor(() => {
            expect(transport.get).toHaveBeenCalled();
        });

        // connect() is idempotent — only one actual connection attempt should have been made
        expect(transport.get).toHaveBeenCalledTimes(1);
    });

    it("should not propagate reconnection failure to the caller", async () => {
        const { mockRequest, postResponse } = createEchoRequestAndResponse("DIFFERENT-STATE");
        const transport = createMockTransport({ getResponse: mockSession, postResponse });
        const logger = createMockLogger();

        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            logger,
            autoReconnect: true,
        });
        await client.connect();

        // Make reconnection fail
        transport.get.mockRejectedValueOnce(new Error("Network failure"));

        const response = await client.sendAPIRequest(mockRequest);

        // Original response is still returned
        expect(response).toHaveProperty("methodResponses");
        expect(response.sessionState).toBe("DIFFERENT-STATE");

        // Wait for the failed reconnection to settle
        await vi.waitFor(() => {
            expect(logger.error).toHaveBeenCalledWith("Automatic reconnection failed", {
                error: expect.any(Error),
            });
        });
    });

    it("should return this from withAutoReconnect() for chaining", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        const result = client.withAutoReconnect(true);
        expect(result).toBe(client);
    });

    it("should allow disabling auto-reconnect with withAutoReconnect(false)", async () => {
        const { mockRequest, postResponse } = createEchoRequestAndResponse("DIFFERENT-STATE");
        const transport = createMockTransport({ getResponse: mockSession, postResponse });

        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            autoReconnect: true,
        });
        client.withAutoReconnect(false);
        await client.connect();
        transport.get.mockClear();

        await client.sendAPIRequest(mockRequest);

        // No reconnection attempt because it was disabled
        expect(transport.get).not.toHaveBeenCalled();
    });

    it("should queue new requests during reconnection and use the fresh session", async () => {
        const { mockRequest: request1, postResponse: postResponse1 } =
            createEchoRequestAndResponse("DIFFERENT-STATE");
        const { mockRequest: request2, postResponse: postResponse2 } = createEchoRequestAndResponse();

        // Create a deferred promise for the reconnection session fetch
        const { promise: reconnectPromise, resolve: resolveReconnect } =
            Promise.withResolvers<typeof mockSession>();

        const transport = createMockTransport({ getResponse: mockSession });
        transport.post.mockResolvedValueOnce(postResponse1).mockResolvedValueOnce(postResponse2);

        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            autoReconnect: true,
        });
        await client.connect();

        // Make the reconnection session fetch hang until we resolve it
        transport.get.mockReturnValueOnce(reconnectPromise);

        // First request triggers staleness and auto-reconnect
        const response1 = await client.sendAPIRequest(request1);
        expect(response1.sessionState).toBe("DIFFERENT-STATE");

        // Second request should queue while reconnection is pending
        const sendPromise2 = client.sendAPIRequest(request2);

        // Resolve the reconnection
        resolveReconnect(mockSession);

        const response2 = await sendPromise2;
        expect(response2).toHaveProperty("methodResponses");
    });
});
