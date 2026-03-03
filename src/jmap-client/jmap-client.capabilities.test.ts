import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockTransport } from "./test-utils.js";

describe("JMAPClient capabilities", () => {
    it("should get the capabilities after connecfting", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        await client.connect();
        expect(client.serverCapabilities).toEqual(mockSession.capabilities);
    });

    it("should return null for capabilities if the session has not been retrieved", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        expect(client.serverCapabilities).toBe(null);
    });

    it("should get the accounts after connecfting", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        await client.connect();

        expect(client.accounts).toEqual(mockSession.accounts);
    });

    it("should return null for accounts if the session has not been retrieved", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        expect(client.accounts).toBe(null);
    });

    it("should get the primaryAccounts after connecfting", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        await client.connect();
        expect(client.primaryAccounts).toEqual(mockSession.primaryAccounts);
    });

    it("should return an empty object for primaryAccounts if the session has not been retrieved", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
        });
        expect(client.primaryAccounts).toEqual({});
    });

    it("should return true if a capability is supported", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        await client.connect();
        expect(client.isSupported("urn:ietf:params:jmap:mail")).toBe(true);
    });

    it("should return false if called before connecting", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        expect(client.isSupported("urn:ietf:params:jmap:mail")).toBe(false);
    });

    it("should return false if a capability is not supported", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        await client.connect();
        expect(client.isSupported("urn:ietf:params:jmap:mdn")).toBe(false);
    });

    it("should return true for the core capability URI even before connecting", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        expect(client.isSupported("urn:ietf:params:jmap:core")).toBe(true);
    });
});
