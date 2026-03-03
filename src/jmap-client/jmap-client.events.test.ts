import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockTransport } from "./test-utils.js";

describe("JMAPClient events and emitter", () => {
    it("should set a custom emitter and allow chaining", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const emitter = vi.fn();
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        const result = client.withEmitter(emitter);
        expect(result).toBe(client);
        await client.connect();
        expect(emitter).toHaveBeenCalledWith("status-changed", expect.objectContaining({ status: "connecting" }));
        expect(emitter).toHaveBeenCalledWith("status-changed", expect.objectContaining({ status: "connected" }));
        expect(emitter).not.toHaveBeenCalledWith("status-changed", expect.objectContaining({ status: "disconnected" }));
        await client.disconnect();
        expect(emitter).toHaveBeenCalledWith("status-changed", expect.objectContaining({ status: "disconnected" }));
    });

    it("should emit status-changed event on connection status change", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const emitter = vi.fn();
        const client = new JMAPClient(transport, {
            hostname: "api.example.com",
            emitter,
        });
        await client.connect();
        expect(emitter).toHaveBeenCalledWith("status-changed", expect.objectContaining({ status: "connecting" }));
        expect(emitter).toHaveBeenCalledWith("status-changed", expect.objectContaining({ status: "connected" }));
        expect(emitter).not.toHaveBeenCalledWith("status-changed", expect.objectContaining({ status: "disconnected" }));
        await client.disconnect();
        expect(emitter).toHaveBeenCalledWith("status-changed", expect.objectContaining({ status: "disconnected" }));
    });

    it("should not emit status-changed event if connection status does not change", async () => {
        const transport = createMockTransport();
        const emitter = vi.fn();
        const client = new JMAPClient(transport, { hostname: "api.example.com" }).withEmitter(emitter);
        await client.disconnect(); // Should not emit because already disconnected
        expect(emitter).not.toHaveBeenCalled();
    });
});
