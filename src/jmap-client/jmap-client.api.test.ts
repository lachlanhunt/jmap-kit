import { CoreInvocation } from "../capabilities/core/core.js";
import { LIMIT, NOT_JSON, NOT_REQUEST, UNKNOWN_CAPABILITY } from "../common/registry.js";
import { InvocationList } from "../invocation-factory/invocation-list.js";
import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import {
    createEchoRequestAndResponse,
    createErrorTransport,
    createMockAbortableTransport,
    createMockLogger,
    createMockTransport,
    makeAbortError,
} from "./test-utils.js";
import { JMAPRequestError } from "./utils/jmap-request-error.js";

describe("JMAPClient API", () => {
    it("should send an API request", async () => {
        const { mockRequest, postResponse } = createEchoRequestAndResponse();
        const transport = createMockTransport({ getResponse: mockSession, postResponse });

        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
        });
        await client.connect();

        const response = await client.sendAPIRequest(mockRequest);

        expect(response).toHaveProperty("methodResponses");
        expect(response).toHaveProperty("sessionState");
        expect(response).toHaveProperty("createdIds");

        expect(response.sessionState).toBe(mockSession.state);
        expect(response.methodResponses).toBeInstanceOf(InvocationList);
        expect(response.createdIds).toEqual({});

        // For compatibility with previous assertions
        const responses = Array.from(response.methodResponses);
        expect(responses[0]).toBeInstanceOf(CoreInvocation);
        expect(responses[0]?.id).toBe(mockRequest.reverseIdMap.get("id_0"));
        expect(responses[1]?.id).toBe(mockRequest.reverseIdMap.get("id_1"));

        // Check that transport.post was called with the correct options object
        expect(transport.post).toHaveBeenCalledWith(
            "https://api.example.com/jmap/api/",
            expect.objectContaining({
                headers: expect.toHaveHeaders({
                    "Content-Type": "application/json",
                }),
                responseType: "json",
                signal: expect.any(AbortSignal),
                body: expect.any(String),
            }),
        );
    });

    it("should include sessionState and createdIds in the API response", async () => {
        const { mockRequest, postResponse } = createEchoRequestAndResponse("test-session-state");
        // Add createdIds to the postResponse
        const postResponseWithCreatedIds = {
            ...postResponse,
            createdIds: { c1: "M123", c2: "M124" },
        };
        const transport = createMockTransport({ getResponse: mockSession, postResponse: postResponseWithCreatedIds });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
        });
        await client.connect();
        const response = await client.sendAPIRequest(mockRequest);
        expect(response.sessionState).toBe("test-session-state");
        expect(response.createdIds).toEqual({ c1: "M123", c2: "M124" });
    });

    it("should fail to send an API request when the client is disconnected", async () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
        });
        const { mockRequest } = createEchoRequestAndResponse();
        await expect(client.sendAPIRequest(mockRequest)).rejects.toThrow(
            "Cannot send API request, client disconnected",
        );
        // Optionally, check that transport.post was not called
        expect(transport.post).not.toHaveBeenCalled();
    });

    it("should wait for the client to connect before sending an API request", async () => {
        const { mockRequest, postResponse } = createEchoRequestAndResponse();
        const { promise: connectionPromise, resolve: connectionResolve } = Promise.withResolvers<typeof mockSession>();
        const transport = createMockTransport({ postResponse });
        transport.get.mockImplementation(() => connectionPromise); // Override to return a promise that resolves later
        const logger = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api.example.com", logger });
        const connecting = client.connect();
        const sendPromise = client.sendAPIRequest(mockRequest);
        expect(logger.debug).toHaveBeenCalledWith(
            "Waiting for JMAP Client to finish connecting before sending API request",
        );
        expect(logger.info).not.toHaveBeenCalledWith("Sending API request");
        connectionResolve(mockSession);
        await connecting;
        const response = await sendPromise;
        expect(logger.info).toHaveBeenCalledWith("Sending JMAP API request");
        expect(response).toHaveProperty("methodResponses");
        expect(response.methodResponses).toBeInstanceOf(InvocationList);
        expect(response.methodResponses.size).toBe(2);
    });

    it("should reject sendAPIRequest if waiting for connection and the connection fails", async () => {
        const { mockRequest } = createEchoRequestAndResponse();
        const { promise: connectionPromise, reject: connectionReject } = Promise.withResolvers<typeof mockSession>();
        const transport = createMockTransport();
        transport.get.mockImplementation(() => connectionPromise); // Simulate pending connection
        const logger = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api.example.com", logger });
        const connecting = client.connect();
        const sendPromise = client.sendAPIRequest(mockRequest);
        connectionReject(new Error("Connection failed"));
        await expect(() => connecting).rejects.toThrow("Connection failed");
        await expect(sendPromise).rejects.toThrow("Failed to send API request, client failed to connect");
    });

    it("should abort the API request if the signal is aborted before sending", async () => {
        const { mockRequest } = createEchoRequestAndResponse();
        const transport = createMockAbortableTransport({ getResponse: mockSession });
        const expectedError = makeAbortError();

        // Ensure connect() succeeds by resolving the first get call
        transport.get.mockResolvedValueOnce(mockSession);
        const logger = createMockLogger();
        const emitter = vi.fn();

        const client = new JMAPClient(transport, { hostname: "api.example.com", logger, emitter });
        await client.connect();

        const controller = new AbortController();
        controller.abort();
        await expect(client.sendAPIRequest(mockRequest, controller.signal)).rejects.toThrow(expectedError);
        expect(transport.post).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith("API request failed", { error: expectedError });
        expect(emitter).toHaveBeenCalledWith("transport-error", expect.objectContaining({ error: expectedError }));
    });

    it("should abort the API request if the signal is aborted during the request", async () => {
        const { mockRequest } = createEchoRequestAndResponse();
        const transport = createMockAbortableTransport({ getResponse: mockSession });
        const logger = createMockLogger();
        const emitter = vi.fn();

        // Ensure connect() succeeds by resolving the first get call
        transport.get.mockResolvedValueOnce(mockSession);

        const client = new JMAPClient(transport, { hostname: "api.example.com", logger, emitter });
        await client.connect();

        const controller = new AbortController();
        const sendPromise = client.sendAPIRequest(mockRequest, controller.signal);

        const expectedError = makeAbortError();
        controller.abort();

        await expect(sendPromise).rejects.toThrow(expectedError);
        expect(logger.error).toHaveBeenCalledWith("API request failed", { error: expectedError });
        expect(emitter).toHaveBeenCalledWith("transport-error", expect.objectContaining({ error: expectedError }));
    });

    it("should resolve the API request if the signal is not aborted", async () => {
        const { mockRequest, postResponse } = createEchoRequestAndResponse();
        const transport = createMockTransport({ getResponse: mockSession, postResponse });
        const logger = createMockLogger();
        const emitter = vi.fn();

        const client = new JMAPClient(transport, { hostname: "api.example.com", logger, emitter });
        await client.connect();

        const controller = new AbortController();

        const response = await client.sendAPIRequest(mockRequest, controller.signal);
        expect(response).toHaveProperty("methodResponses");
        expect(response.methodResponses).toBeInstanceOf(InvocationList);

        expect(transport.post).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );

        // Should not log or emit errors
        expect(logger.error).not.toHaveBeenCalledWith("API request failed", expect.anything());
        expect(emitter).not.toHaveBeenCalledWith("transport-error", expect.anything());
    });

    it("should emit 'session-stale' if the session state changes between connect and API response", async () => {
        // Use a different sessionState for the API response
        const { mockRequest, postResponse } = createEchoRequestAndResponse("DIFFERENT-STATE");
        const transport = createMockTransport({ getResponse: mockSession, postResponse });
        const logger = createMockLogger();
        const emitter = vi.fn();

        const client = new JMAPClient(transport, { hostname: "api.example.com", logger, emitter });
        await client.connect();

        await client.sendAPIRequest(mockRequest);

        expect(logger.warn).toHaveBeenCalledWith(
            "JMAP Server session state has changed; client may be out of sync. Reconnection recommended.",
        );
        expect(emitter).toHaveBeenCalledWith("session-stale", {
            oldSessionState: mockSession.state,
            newSessionState: "DIFFERENT-STATE",
        });
    });

    describe("JMAPRequestError handling", () => {
        it("should handle unknownCapability error", async () => {
            const { mockRequest } = createEchoRequestAndResponse();
            const errorDetails = {
                type: UNKNOWN_CAPABILITY,
                status: 400,
                detail: "The server does not support the requested capability",
            };
            const transport = createErrorTransport(errorDetails);

            // Mock the get method to return a valid session for the connect() call
            transport.get.mockResolvedValueOnce(mockSession);

            const logger = createMockLogger();
            const emitter = vi.fn();

            const client = new JMAPClient(transport, { hostname: "api.example.com", logger, emitter });
            await client.connect();

            // The request should fail with the JMAPRequestError
            await expect(client.sendAPIRequest(mockRequest)).rejects.toThrow(JMAPRequestError);

            // Verify the error was logged and emitted correctly
            expect(logger.error).toHaveBeenCalledWith(
                "JMAP request error: urn:ietf:params:jmap:error:unknownCapability",
                expect.objectContaining({ error: expect.any(JMAPRequestError) }),
            );

            expect(emitter).toHaveBeenCalledWith(
                "request-error",
                expect.objectContaining({
                    error: expect.objectContaining({
                        type: UNKNOWN_CAPABILITY,
                        status: 400,
                        problemDetails: errorDetails,
                    }),
                }),
            );
        });

        it("should handle notJSON error", async () => {
            const { mockRequest } = createEchoRequestAndResponse();
            const errorDetails = {
                type: NOT_JSON,
                status: 400,
                title: "Invalid JSON in request",
            };
            const transport = createErrorTransport(errorDetails);

            // Mock the get method to return a valid session for the connect() call
            transport.get.mockResolvedValueOnce(mockSession);

            const logger = createMockLogger();
            const emitter = vi.fn();

            const client = new JMAPClient(transport, { hostname: "api.example.com", logger, emitter });
            await client.connect();

            // The request should fail with the JMAPRequestError
            const errorPromise = client.sendAPIRequest(mockRequest);
            await expect(errorPromise).rejects.toThrow("Invalid JSON in request");

            try {
                await errorPromise;
            } catch (error) {
                // Verify the error instance has all expected properties
                if (error instanceof JMAPRequestError) {
                    expect(error.type).toBe(NOT_JSON);
                    expect(error.status).toBe(400);
                    expect(error.problemDetails).toEqual(errorDetails);
                } else {
                    // This should never happen, but if it does, fail the test
                    expect.fail("Expected error to be an instance of JMAPRequestError");
                }
            }

            // Verify the error was logged and emitted correctly
            expect(logger.error).toHaveBeenCalledWith(
                "JMAP request error: urn:ietf:params:jmap:error:notJSON",
                expect.objectContaining({ error: expect.any(JMAPRequestError) }),
            );

            expect(emitter).toHaveBeenCalledWith(
                "request-error",
                expect.objectContaining({
                    error: expect.objectContaining({
                        type: NOT_JSON,
                        status: 400,
                    }),
                }),
            );
        });

        it("should handle notRequest error", async () => {
            const { mockRequest } = createEchoRequestAndResponse();
            const errorDetails = {
                type: NOT_REQUEST,
                status: 400,
            };
            const transport = createErrorTransport(errorDetails);

            // Mock the get method to return a valid session for the connect() call
            transport.get.mockResolvedValueOnce(mockSession);

            const logger = createMockLogger();
            const emitter = vi.fn();

            const client = new JMAPClient(transport, { hostname: "api.example.com", logger, emitter });
            await client.connect();

            // The request should fail with the JMAPRequestError
            await expect(client.sendAPIRequest(mockRequest)).rejects.toThrow(
                "The request did not match the required JMAP request format",
            );

            // Verify the error was logged and emitted correctly
            expect(logger.error).toHaveBeenCalledWith(
                "JMAP request error: urn:ietf:params:jmap:error:notRequest",
                expect.objectContaining({ error: expect.any(JMAPRequestError) }),
            );

            expect(emitter).toHaveBeenCalledWith(
                "request-error",
                expect.objectContaining({
                    error: expect.objectContaining({
                        type: NOT_REQUEST,
                        status: 400,
                    }),
                }),
            );
        });

        it("should handle limit error with additional properties", async () => {
            const { mockRequest } = createEchoRequestAndResponse();
            const errorDetails = {
                type: LIMIT,
                status: 429,
                title: "Rate limit exceeded",
                limit: "maxCallsPerMinute",
                retryAfter: 60,
            };
            const transport = createErrorTransport(errorDetails);

            // Mock the get method to return a valid session for the connect() call
            transport.get.mockResolvedValueOnce(mockSession);

            const logger = createMockLogger();
            const emitter = vi.fn();

            const client = new JMAPClient(transport, { hostname: "api.example.com", logger, emitter });
            await client.connect();

            // The request should fail with the JMAPRequestError
            await expect(client.sendAPIRequest(mockRequest)).rejects.toThrow("Rate limit exceeded");

            // Verify the error was logged and emitted correctly
            expect(logger.error).toHaveBeenCalledWith(
                "JMAP request error: urn:ietf:params:jmap:error:limit",
                expect.objectContaining({
                    error: expect.objectContaining({
                        problemDetails: expect.objectContaining({
                            limit: "maxCallsPerMinute",
                            retryAfter: 60,
                        }),
                    }),
                }),
            );

            // Verify that the additional properties were preserved
            expect(emitter).toHaveBeenCalledWith(
                "request-error",
                expect.objectContaining({
                    error: expect.objectContaining({
                        type: LIMIT,
                        status: 429,
                        problemDetails: expect.objectContaining({
                            limit: "maxCallsPerMinute",
                            retryAfter: 60,
                        }),
                    }),
                }),
            );
        });

        it("should handle custom error types", async () => {
            const { mockRequest } = createEchoRequestAndResponse();
            const errorDetails = {
                type: "https://example.com/probs/custom-error",
                status: 500,
                title: "Custom server error",
                detail: "A detailed explanation of what went wrong",
                serverInfo: { id: "server-123", region: "us-west" },
            };
            const transport = createErrorTransport(errorDetails);

            // Mock the get method to return a valid session for the connect() call
            transport.get.mockResolvedValueOnce(mockSession);

            const logger = createMockLogger();
            const emitter = vi.fn();

            const client = new JMAPClient(transport, { hostname: "api.example.com", logger, emitter });
            await client.connect();

            // The request should fail with the JMAPRequestError
            await expect(client.sendAPIRequest(mockRequest)).rejects.toThrow(
                "A detailed explanation of what went wrong",
            );

            // Verify the error was logged and emitted correctly
            expect(logger.error).toHaveBeenCalledWith(
                "JMAP request error: https://example.com/probs/custom-error",
                expect.objectContaining({ error: expect.any(JMAPRequestError) }),
            );

            // Verify that all the custom properties were preserved
            expect(emitter).toHaveBeenCalledWith(
                "request-error",
                expect.objectContaining({
                    error: expect.objectContaining({
                        type: "https://example.com/probs/custom-error",
                        status: 500,
                        problemDetails: expect.objectContaining({
                            serverInfo: { id: "server-123", region: "us-west" },
                        }),
                    }),
                }),
            );
        });
    });
});
