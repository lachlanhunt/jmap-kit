import type { EventEmitterFn } from "../types.js";
import { createEmitter } from "./emitter.js";

describe("createEmitter", () => {
    it("should call the provided emitter function", () => {
        const emitter = vi.fn<EventEmitterFn>();
        const safeEmitter = createEmitter(() => emitter);

        const payload = { status: "connected", sessionState: "abc123" };
        safeEmitter("status-changed", payload);

        expect(emitter).toHaveBeenCalledWith("status-changed", payload);
        expect(emitter).toHaveBeenCalledTimes(1);
    });

    it("should not throw if emitter is missing", () => {
        const safeEmitter = createEmitter(() => undefined);
        const payload = {
            oldSessionState: "abc123",
            newSessionState: "def456",
        };

        expect(() => safeEmitter("session-stale", payload)).not.toThrow();
    });

    it("should swallow errors thrown by the provided emitter", () => {
        const errorEmitter = vi.fn<EventEmitterFn>(() => {
            throw new Error("fail");
        });
        const safeEmitter = createEmitter(() => errorEmitter);

        const error = new Error("test error");
        const payload = { error };
        expect(() => safeEmitter("transport-error", payload)).not.toThrow();
        expect(errorEmitter).toHaveBeenCalledTimes(1);
    });
});
