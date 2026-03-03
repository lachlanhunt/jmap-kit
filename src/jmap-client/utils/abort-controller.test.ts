import { createAbortController } from "./abort-controller.js";

describe("createAbortController", () => {
    it("should return a new AbortController", () => {
        const controller = createAbortController();
        expect(controller).toBeInstanceOf(AbortController);
    });

    it("should abort if the external signal is already aborted", () => {
        const external = new AbortController();
        external.abort();
        const controller = createAbortController(external.signal);
        expect(controller.signal.aborted).toBe(true);
    });

    it("should abort when the external signal aborts", () => {
        const external = new AbortController();
        const controller = createAbortController(external.signal);
        expect(controller.signal.aborted).toBe(false);
        external.abort();
        expect(controller.signal.aborted).toBe(true);
    });

    it("should abort the external signal listener when the controller aborts", () => {
        const external = new AbortController();
        const controller = createAbortController(external.signal);
        const onAbort = vi.fn();
        external.signal.addEventListener("abort", onAbort);
        controller.abort();
        // The external signal should not be aborted, but the event listener should be removed
        expect(external.signal.aborted).toBe(false);
    });
});
