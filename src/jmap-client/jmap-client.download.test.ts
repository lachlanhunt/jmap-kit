import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockAbortableTransport, createMockTransport, expectURL } from "./test-utils.js";
import { JMAPRequestError } from "./utils/jmap-request-error.js";

describe("JMAPClient download", () => {
    it("should get the downloadFile after connecfting", async () => {
        const blobData = new Blob([new Uint8Array(8)]);
        const transport = createMockTransport({ getResponse: blobData });
        transport.get.mockResolvedValueOnce(mockSession); // Return session data on first call
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        await client.connect();
        const file = await client.downloadFile("u0b5a3998", "1234-5678", "some-file.pdf", "application/pdf");
        expect(file).toBe(blobData);
        expect(transport.get).toHaveBeenLastCalledWith(
            expect.any(URL),
            expect.objectContaining({
                headers: expect.toHaveHeaders({
                    Accept: "application/pdf",
                }),
                responseType: "blob",
                signal: expect.any(AbortSignal),
            }),
        );
    });

    it("should abort the download if the signal is aborted before sending", async () => {
        const transport = createMockAbortableTransport({ getResponse: new Blob([new Uint8Array(8)]) });
        transport.get.mockResolvedValueOnce(mockSession); // Return session data on first call
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        await client.connect();
        const controller = new AbortController();
        controller.abort();
        await expect(
            client.downloadFile("u0b5a3998", "1234-5678", "some-file.pdf", "application/pdf", controller.signal),
        ).rejects.toThrow(/aborted/i);
        expect(transport.get).toHaveBeenLastCalledWith(
            expect.any(URL),
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
    });

    it("should abort the download if the signal is aborted during the request", async () => {
        const transport = createMockAbortableTransport({ getResponse: new Blob([new Uint8Array(8)]) });
        transport.get.mockResolvedValueOnce(mockSession); // Return session data on first call

        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        await client.connect();

        const controller = new AbortController();
        const downloadPromise = client.downloadFile(
            "u0b5a3998",
            "1234-5678",
            "some-file.pdf",
            "application/pdf",
            controller.signal,
        );
        controller.abort();

        await expect(downloadPromise).rejects.toThrow(/aborted/i);
        expect(transport.get).toHaveBeenLastCalledWith(
            expect.any(URL),
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
    });

    it("should resolve the download if the signal is not aborted", async () => {
        const blobData = new Blob([new Uint8Array(8)]);
        const transport = createMockTransport({ getResponse: blobData });

        transport.get.mockResolvedValueOnce(mockSession); // Return session data on first call
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        await client.connect();

        const controller = new AbortController();
        const file = await client.downloadFile(
            "u0b5a3998",
            "1234-5678",
            "some-file.pdf",
            "application/pdf",
            controller.signal,
        );
        expect(file).toBe(blobData);
        expect(transport.get).toHaveBeenLastCalledWith(
            expect.any(URL),
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
    });

    it("should throw an error if getDownloadUrl is called before connecting", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
        });
        expect(() => client.getDownloadUrl("accountId", "blobId", "name", "type")).toThrow(
            "Client is not connected to a JMAP server",
        );
    });

    it("should correctly expand the URL with the supplied parameters", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            port: 443,
        });
        await client.connect();
        const url = client.getDownloadUrl("u0b5a3998", "1234-5678", "some-file.pdf", "application/pdf");
        expectURL(url);
        expect(url.pathname).toBe("/jmap/download/u0b5a3998/1234-5678/some-file.pdf");
        expect(url.searchParams.get("type")).toBe("application/pdf");
    });

    it("should emit download-error for JMAPRequestError", async () => {
        // Create a JMAPRequestError
        const requestError = new JMAPRequestError({
            type: "urn:ietf:params:jmap:error:serverUnavailable",
            status: 503,
            detail: "The server is temporarily unavailable",
        });

        const errorTransport = {
            get: vi
                .fn()
                .mockResolvedValueOnce(mockSession) // First call returns session
                .mockRejectedValueOnce(requestError), // Second call rejects with error
            post: vi.fn(), // Add post method to satisfy Transport interface
        };

        const emitMock = vi.fn();
        const errorClient = new JMAPClient(errorTransport, {
            hostname: "api.example.com",
            emitter: emitMock,
        });

        await errorClient.connect();

        await expect(
            errorClient.downloadFile("u0b5a3998", "1234-5678", "some-file.pdf", "application/pdf"),
        ).rejects.toThrow(JMAPRequestError);

        expect(emitMock).toHaveBeenCalledWith("download-error", {
            accountId: "u0b5a3998",
            blobId: "1234-5678",
            error: requestError,
        });
    });

    it("should emit transport-error for network errors", async () => {
        const networkError = new Error("Network error");

        const errorTransport = {
            get: vi
                .fn()
                .mockResolvedValueOnce(mockSession) // First call returns session
                .mockRejectedValueOnce(networkError), // Second call rejects with error
            post: vi.fn(), // Add post method to satisfy Transport interface
        };

        const emitMock = vi.fn();
        const errorClient = new JMAPClient(errorTransport, {
            hostname: "api.example.com",
            emitter: emitMock,
        });

        await errorClient.connect();

        await expect(
            errorClient.downloadFile("u0b5a3998", "1234-5678", "some-file.pdf", "application/pdf"),
        ).rejects.toThrow("Network error");

        expect(emitMock).toHaveBeenCalledWith("transport-error", {
            error: networkError,
        });
    });
});
