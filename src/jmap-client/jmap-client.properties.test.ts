import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockTransport } from "./test-utils.js";

describe("JMAPClient properties", () => {
    it("should get the username after connecfting", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        await client.connect();
        expect(client.username).toEqual(mockSession.username);
    });

    it("should return empty string for username if the session has not been retrieved", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        expect(client.username).toBe("");
    });

    it("should get the apiUrl after connecfting", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        await client.connect();
        expect(client.apiUrl).toEqual(mockSession.apiUrl);
    });

    it("should return empty string for apiUrl if the session has not been retrieved", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        expect(client.apiUrl).toBe("");
    });

    it("should get the uploadUrl after connecfting", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        await client.connect();
        expect(client.uploadUrl).toEqual(mockSession.uploadUrl);
    });

    it("should return empty string for uploadUrl if the session has not been retrieved", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        expect(client.uploadUrl).toBe("");
    });

    it("should get the eventSourceUrl after connecfting", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        await client.connect();
        expect(client.eventSourceUrl).toEqual(mockSession.eventSourceUrl);
    });

    it("should return empty string for eventSourceUrl if the session has not been retrieved", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        expect(client.eventSourceUrl).toBe("");
    });

    it("should return the downloadUrl from the session after connecting", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        await client.connect();
        expect(client.downloadUrl).toBe(mockSession.downloadUrl);
    });

    it("should return an empty string for downloadUrl if the session has not been retrieved", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        expect(client.downloadUrl).toBe("");
    });
});
