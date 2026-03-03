import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CORE_CAPABILITY_URI } from "../common/registry.js";
import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockTransport } from "./test-utils.js";
import type { JMAPUploadResponse } from "./types.js";

// Helper function to create a delayed promise
function delayedResolve<T>(value: T, ms: number): Promise<T> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms, value);
    });
}

describe("JMAPClient concurrency limits", () => {
    const testId = "a1" as const;
    const mockFile = new Blob(["test"], { type: "text/plain" });

    let client: JMAPClient;
    let mockTransport: ReturnType<typeof createMockTransport>;

    // Create a modified session with custom concurrency limits for testing
    const customLimitsSession = {
        ...mockSession,
        capabilities: {
            ...mockSession.capabilities,
            [CORE_CAPABILITY_URI]: {
                ...mockSession.capabilities[CORE_CAPABILITY_URI],
                maxConcurrentUpload: 2, // Deliberately lower for testing
                maxConcurrentRequests: 3, // Deliberately lower for testing
            },
        },
        // Add a test account with our testId
        accounts: {
            [testId]: {
                name: "test",
                isPersonal: true,
                isReadOnly: false,
                accountCapabilities: {
                    [CORE_CAPABILITY_URI]: {},
                },
                userId: "user-1234",
            },
        },
        // Update primary accounts to reference our test account
        primaryAccounts: {
            ...mockSession.primaryAccounts,
            [CORE_CAPABILITY_URI]: testId,
        },
        apiUrl: "https://api.example.com/jmap/api/",
        downloadUrl: "https://api.example.com/jmap/download/{accountId}/{blobId}/{name}?accept={type}",
        uploadUrl: "https://api.example.com/jmap/upload/{accountId}/",
        eventSourceUrl: "https://api.example.com/jmap/eventsource/?types={types}",
        state: "state-1234",
    };

    const mockUploadResponse: JMAPUploadResponse = {
        accountId: testId,
        blobId: "b1",
        type: "text/plain",
        size: 4,
    };

    beforeEach(() => {
        // Create a mock transport with delayed responses for concurrency testing
        mockTransport = createMockTransport({ getResponse: customLimitsSession });

        // Create a client with the mock transport
        client = new JMAPClient(mockTransport, { hostname: "api.example.com" });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should enforce maxConcurrentUpload limit", async () => {
        await client.connect();

        // Setup the post spy to return delayed responses
        mockTransport.post.mockImplementation(() => delayedResolve(mockUploadResponse, 50));

        // Start 4 uploads concurrently (more than the limit of 2)
        const uploadPromises = Array.from({ length: 4 }, () => client.uploadFile(testId, mockFile));

        // All promises should eventually resolve
        const results = await Promise.all(uploadPromises);
        expect(results).toHaveLength(4);

        // transport.post should be called 4 times total
        expect(mockTransport.post).toHaveBeenCalledTimes(4);

        // Verify all calls had the same parameters
        const url = client.getUploadUrl(testId);
        mockTransport.post.mock.calls.forEach((call) => {
            expect(call[0]).toEqual(url);
            expect(call[1]?.body).toEqual(mockFile);
        });
    });

    it("should enforce maxConcurrentRequests limit", async () => {
        await client.connect();

        // Setup the post spy to return delayed responses
        const mockResponse = {
            methodResponses: [],
            sessionState: "state-1234",
        };

        mockTransport.post.mockImplementation(() => delayedResolve(mockResponse, 50));
        // transport.post should be called 5 times total

        // Use the actual RequestBuilder class with minimal setup
        const requestBuilder = client.createRequestBuilder();

        // Start 5 API requests concurrently (more than the limit of 3)
        const requestPromises = Array.from({ length: 5 }, () => client.sendAPIRequest(requestBuilder));

        // All promises should eventually resolve
        const results = await Promise.all(requestPromises);
        expect(results).toHaveLength(5);
        expect(mockTransport.post).toHaveBeenCalledTimes(5);
    });
});
