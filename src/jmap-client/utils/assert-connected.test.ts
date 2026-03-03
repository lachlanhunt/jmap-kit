import { assertConnected } from "./assert-connected.js";

describe("assertConnected", () => {
    it("should not throw for 'connected' status", () => {
        expect(() => {
            assertConnected("connected");
        }).not.toThrow();
    });

    it("should throw for non-'connected' status", () => {
        expect(() => {
            assertConnected("disconnected");
        }).toThrow("Client is not connected to a JMAP server");
        expect(() => {
            assertConnected("connecting");
        }).toThrow("Client is not connected to a JMAP server");
    });
});
