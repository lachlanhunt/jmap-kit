import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CORE_CAPABILITY_URI } from "../common/registry.js";
import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockTransport } from "./test-utils.js";
import type { JMAPUploadResponse } from "./types.js";
import { JMAPRequestError } from "./utils/jmap-request-error.js";

describe("JMAPClient upload methods", () => {
    let client: JMAPClient;
    let mockTransport: ReturnType<typeof createMockTransport>;

    // Test account ID and blob ID for uploads
    const testId = "u0b5a3998";
    const testBlobId = "b1";

    // Create a modified session with custom account for upload tests
    const uploadTestSession = {
        ...mockSession,
        capabilities: {
            ...mockSession.capabilities,
            [CORE_CAPABILITY_URI]: {
                ...mockSession.capabilities[CORE_CAPABILITY_URI],
                maxSizeUpload: 50_000_000, // Custom value for testing size limits
            },
        },
        // Update URLs to use example.com domain for consistency
        apiUrl: "https://api.example.com/jmap/api/",
        downloadUrl: "https://api.example.com/jmap/download/{accountId}/{blobId}/{name}?type={type}",
        uploadUrl: "https://api.example.com/jmap/upload/{accountId}/",
    };

    const mockUploadResponse: JMAPUploadResponse = {
        accountId: testId,
        blobId: testBlobId,
        type: "image/png",
        size: 1024,
    };

    beforeEach(() => {
        mockTransport = createMockTransport({
            getResponse: uploadTestSession,
            postResponse: mockUploadResponse,
        });
        client = new JMAPClient(mockTransport, { hostname: "api.example.com" });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("getUploadUrl", () => {
        it("should throw error when client is not connected", () => {
            expect(() => client.getUploadUrl(testId)).toThrow("Client is not connected to a JMAP server");
        });

        it("should generate the correct URL from template", async () => {
            await client.connect();
            const url = client.getUploadUrl(testId);
            expect(url.toString()).toBe("https://api.example.com/jmap/upload/u0b5a3998/");
        });

        it("should throw error when uploadUrl is missing from session", async () => {
            const badSession = {
                ...uploadTestSession,
                uploadUrl: "", // Empty upload URL
            };
            const clientWithBadSession = new JMAPClient(createMockTransport({ getResponse: badSession }), {
                hostname: "api.example.com",
            });

            await clientWithBadSession.connect();
            expect(() => clientWithBadSession.getUploadUrl(testId)).toThrow("Missing uploadUrl in session");
        });

        it("should throw error when account ID is not found in session", async () => {
            await client.connect();
            const invalidAccountId = "invalid-account-id";
            expect(() => client.getUploadUrl(invalidAccountId)).toThrow(
                `Account ${invalidAccountId} not found in session`,
            );
        });

        it("should append parameters as query string when placeholders are omitted from template URL", async () => {
            // Create a session with a fixed upload URL without {accountId} placeholder
            const fixedUrlSession = {
                ...uploadTestSession,
                uploadUrl: "https://api.example.com/jmap/upload/",
            };

            const fixedUrlClient = new JMAPClient(createMockTransport({ getResponse: fixedUrlSession }), {
                hostname: "api.example.com",
            });

            await fixedUrlClient.connect();
            const url = fixedUrlClient.getUploadUrl(testId);

            // Should append accountId as a query parameter
            expect(url.toString()).toBe("https://api.example.com/jmap/upload/?accountId=u0b5a3998");
        });

        it("should handle form-style query expansion in templates", async () => {
            // Create a session with a form-style query expansion template
            const queryStyleSession = {
                ...uploadTestSession,
                uploadUrl: "https://api.example.com/jmap/upload/{?accountId}",
            };

            const queryStyleClient = new JMAPClient(createMockTransport({ getResponse: queryStyleSession }), {
                hostname: "api.example.com",
            });

            await queryStyleClient.connect();
            const url = queryStyleClient.getUploadUrl(testId);

            // Should correctly expand the query parameter
            expect(url.toString()).toBe("https://api.example.com/jmap/upload/?accountId=u0b5a3998");
        });
    });

    describe("uploadFile", () => {
        beforeEach(async () => {
            await client.connect();
        });

        it("should upload a Blob successfully", async () => {
            const testBlob = new Blob(["test content"], { type: "text/plain" });
            const result = await client.uploadFile(testId, testBlob);

            expect(mockTransport.post).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({
                    body: testBlob,
                    headers: expect.toHaveHeaders({
                        "Content-Type": "text/plain",
                    }),
                    responseType: "json",
                }),
            );

            expect(result).toEqual(mockUploadResponse);
        });

        it("should upload an ArrayBuffer successfully", async () => {
            const uint8Array = new TextEncoder().encode("test content");
            const buffer = uint8Array.buffer;
            const result = await client.uploadFile(testId, buffer);

            expect(mockTransport.post).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({
                    body: buffer,
                    headers: expect.toHaveHeaders({
                        "Content-Type": "application/octet-stream",
                    }),
                    responseType: "json",
                }),
            );

            expect(result).toEqual(mockUploadResponse);
        });

        it("should throw error when file size exceeds maximum upload size", async () => {
            // Create a mock blob with a size greater than the maxSizeUpload
            const oversizedBlob = {
                size: 60_000_000, // Larger than maxSizeUpload (50_000_000)
                type: "image/png",
            } as Blob;

            await expect(client.uploadFile(testId, oversizedBlob)).rejects.toThrow(
                "File size (60000000) exceeds server's maximum upload size (50000000)",
            );

            expect(mockTransport.post).not.toHaveBeenCalled();
        });

        it("should pass abort signal to the transport", async () => {
            const testBlob = new Blob(["test content"], { type: "text/plain" });
            const abortController = new AbortController();

            // Wait for the promise to ensure p-limit executes the request
            await client.uploadFile(testId, testBlob, abortController.signal);

            expect(mockTransport.post).toHaveBeenCalledWith(
                expect.any(URL),
                expect.objectContaining({
                    signal: expect.any(AbortSignal),
                }),
            );
        });

        it("should emit upload-error with type=network for network errors", async () => {
            // Use createMockTransport but override post to reject with network error
            const errorTransport = createMockTransport({ getResponse: uploadTestSession });
            errorTransport.post.mockImplementation(() => Promise.reject(new Error("Network error")));

            const emitMock = vi.fn();
            const errorClient = new JMAPClient(errorTransport, {
                hostname: "api.example.com",
                emitter: emitMock,
            });

            await errorClient.connect();

            const testBlob = new Blob(["test content"], { type: "text/plain" });

            await expect(errorClient.uploadFile(testId, testBlob)).rejects.toThrow("Network error");

            expect(emitMock).toHaveBeenCalledWith("transport-error", {
                error: expect.any(Error),
            });
        });

        it("should emit upload-error with type=request for JMAPRequestError", async () => {
            // Use createErrorTransport which creates a transport that will reject with JMAPRequestError
            const problemDetails = {
                type: "urn:ietf:params:jmap:error:serverUnavailable",
                status: 503,
                detail: "The server is temporarily unavailable",
            };

            const errorTransport = createMockTransport({ getResponse: uploadTestSession });
            errorTransport.post.mockImplementation(() => Promise.reject(new JMAPRequestError(problemDetails)));

            const emitMock = vi.fn();
            const errorClient = new JMAPClient(errorTransport, {
                hostname: "api.example.com",
                emitter: emitMock,
            });

            await errorClient.connect();

            const testBlob = new Blob(["test content"], { type: "text/plain" });

            await expect(errorClient.uploadFile(testId, testBlob)).rejects.toThrow(JMAPRequestError);

            expect(emitMock).toHaveBeenCalledWith("upload-error", {
                accountId: testId,
                error: expect.any(JMAPRequestError),
            });
        });
    });
});
