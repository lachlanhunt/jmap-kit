import { beforeEach, describe, expect, it } from "vitest";
import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockTransport } from "./test-utils.js";

describe("JMAPClient getDownloadUrl", () => {
    let client: JMAPClient;
    let mockTransport: ReturnType<typeof createMockTransport>;

    // Test account ID, blob ID, and file details for downloads
    const testAccountId = "u0b5a3998";
    const testBlobId = "b1";
    const testName = "file.pdf";
    const testType = "application/pdf";

    beforeEach(() => {
        mockTransport = createMockTransport({
            getResponse: mockSession,
        });
        client = new JMAPClient(mockTransport, { hostname: "api.example.com" });
    });

    it("should throw error when client is not connected", () => {
        expect(() => client.getDownloadUrl(testAccountId, testBlobId, testName, testType)).toThrow(
            "Client is not connected to a JMAP server",
        );
    });

    it("should generate the correct URL from template", async () => {
        await client.connect();
        const url = client.getDownloadUrl(testAccountId, testBlobId, testName, testType);
        expect(url.toString()).toBe(
            `https://api.example.com/jmap/download/${testAccountId}/${testBlobId}/${testName}?type=${encodeURIComponent(testType)}`,
        );
    });

    it("should throw error when downloadUrl is missing from session", async () => {
        const badSession = {
            ...mockSession,
            downloadUrl: "",
        };

        const clientWithBadSession = new JMAPClient(createMockTransport({ getResponse: badSession }), {
            hostname: "api.example.com",
        });

        await clientWithBadSession.connect();
        expect(() => clientWithBadSession.getDownloadUrl(testAccountId, testBlobId, testName, testType)).toThrow(
            "Missing downloadUrl in session",
        );
    });

    it("should throw error when account ID is not found in session", async () => {
        await client.connect();
        const invalidAccountId = "invalid-account-id";
        expect(() => client.getDownloadUrl(invalidAccountId, testBlobId, testName, testType)).toThrow(
            `Account ${invalidAccountId} not found in session`,
        );
    });

    it("should handle custom templates with query parameters", async () => {
        // Create session with a template that uses query parameters
        const queryParamSession = {
            ...mockSession,
            downloadUrl: "https://api.example.com/jmap/download/{?accountId,blobId,name,type}",
        };
        const queryClient = new JMAPClient(createMockTransport({ getResponse: queryParamSession }), {
            hostname: "api.example.com",
        });

        await queryClient.connect();
        const url = queryClient.getDownloadUrl(testAccountId, testBlobId, testName, testType);

        expect(url.toString()).toBe(
            `https://api.example.com/jmap/download/?accountId=${testAccountId}&blobId=${testBlobId}&name=${testName}&type=${encodeURIComponent(testType)}`,
        );
    });

    it("should append parameters as query string when placeholders are omitted from template URL", async () => {
        // Create a session with a fixed download URL without placeholders
        const fixedUrlSession = {
            ...mockSession,
            downloadUrl: "https://api.example.com/jmap/download/",
        };

        const fixedUrlClient = new JMAPClient(createMockTransport({ getResponse: fixedUrlSession }), {
            hostname: "api.example.com",
        });

        await fixedUrlClient.connect();
        const url = fixedUrlClient.getDownloadUrl(testAccountId, testBlobId, testName, testType);

        // URL should contain all parameters as query params
        expect(url.searchParams.get("accountId")).toBe(testAccountId);
        expect(url.searchParams.get("blobId")).toBe(testBlobId);
        expect(url.searchParams.get("name")).toBe(testName);
        expect(url.searchParams.get("type")).toBe(testType);
    });

    it("should handle partial templates with remaining parameters as query string", async () => {
        // Create a session with a template that only uses some parameters
        const partialSession = {
            ...mockSession,
            downloadUrl: "https://api.example.com/jmap/download/{accountId}/",
        };

        const partialClient = new JMAPClient(createMockTransport({ getResponse: partialSession }), {
            hostname: "api.example.com",
        });

        await partialClient.connect();
        const url = partialClient.getDownloadUrl(testAccountId, testBlobId, testName, testType);

        // URL should contain accountId in path and others as query params
        expect(url.pathname).toContain(`/jmap/download/${testAccountId}/`);
        expect(url.searchParams.get("blobId")).toBe(testBlobId);
        expect(url.searchParams.get("name")).toBe(testName);
        expect(url.searchParams.get("type")).toBe(testType);
    });
});
