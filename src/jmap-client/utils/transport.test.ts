import { createMockAbortableTransport, createMockTransport } from "../test-utils.js";
import type { Transport } from "../types.js";
import { createTransport } from "./transport.js";

describe("createTransport", () => {
    let mockTransport: Transport;
    let activeRequests: Set<Promise<unknown>>;
    let activeAbortControllers: Set<AbortController>;
    let transport: ReturnType<typeof createTransport>;

    beforeEach(() => {
        activeRequests = new Set();
        activeAbortControllers = new Set();
        mockTransport = createMockTransport();
        transport = createTransport(mockTransport, activeRequests, activeAbortControllers);
    });

    it("should track active requests and remove them after completion", async () => {
        expect(activeRequests.size).toBe(0);
        const p = transport.get("/foo");
        expect(activeRequests.size).toBe(1);
        await p;
        expect(activeRequests.size).toBe(0);
    });

    it("should track and clean up AbortControllers", async () => {
        expect(activeAbortControllers.size).toBe(0);
        const p = transport.get("/foo");
        expect(activeAbortControllers.size).toBe(1);
        await p;
        expect(activeAbortControllers.size).toBe(0);
    });

    it("should pass options and signal to the underlying transport", async () => {
        const signal = new AbortController().signal;
        const options = { headers: new Headers({ foo: "bar" }), signal };
        await transport.get("/foo", options);
        expect(mockTransport.get).toHaveBeenCalledWith(
            "/foo",
            expect.objectContaining({
                headers: expect.toHaveHeaders({
                    foo: "bar",
                }),
                signal: expect.any(AbortSignal),
            }),
        );
    });

    it("should pass options and signal to the underlying transport (post)", async () => {
        const signal = new AbortController().signal;
        const options = { headers: new Headers({ foo: "bar" }), signal };
        await transport.post("/foo", options);
        expect(mockTransport.post).toHaveBeenCalledWith(
            "/foo",
            expect.objectContaining({
                headers: expect.toHaveHeaders({
                    foo: "bar",
                }),
                signal: expect.any(AbortSignal),
            }),
        );
    });

    describe("abortable transport", () => {
        beforeEach(() => {
            mockTransport = createMockAbortableTransport();
            transport = createTransport(mockTransport, activeRequests, activeAbortControllers);
        });

        it("should abort the request if the external signal aborts", async () => {
            const external = new AbortController();
            const getPromise = transport.get("/foo", { signal: external.signal });
            expect(activeAbortControllers.size).toBe(1);
            external.abort();
            await expect(getPromise).rejects.toThrow();
            expect(activeAbortControllers.size).toBe(0);
        });

        it("should immediately reject if passed an already-aborted signal (get)", async () => {
            const external = new AbortController();
            external.abort();
            const getPromise = transport.get("/foo", { signal: external.signal });
            await expect(getPromise).rejects.toThrow(/aborted/i);
            expect(activeAbortControllers.size).toBe(0);
        });

        it("should abort all tracked controllers on manual abort", async () => {
            // Simulate two in-flight requests
            const c1 = transport.get("/foo");
            const c2 = transport.get("/bar");
            expect(activeAbortControllers.size).toBe(2);
            for (const controller of Array.from(activeAbortControllers)) {
                controller.abort();
            }
            await expect(c1).rejects.toThrow();
            await expect(c2).rejects.toThrow();
            expect(activeAbortControllers.size).toBe(0);
        });

        it("should abort the post request if the external signal aborts", async () => {
            const external = new AbortController();
            const postPromise = transport.post("/foo", { signal: external.signal });
            expect(activeAbortControllers.size).toBe(1);
            external.abort();
            await expect(postPromise).rejects.toThrow();
            expect(activeAbortControllers.size).toBe(0);
        });

        it("should immediately reject if passed an already-aborted signal (post)", async () => {
            const external = new AbortController();
            external.abort();
            const postPromise = transport.post("/foo", { signal: external.signal });
            await expect(postPromise).rejects.toThrow(/aborted/i);
            expect(activeAbortControllers.size).toBe(0);
        });

        it("should abort all tracked controllers on manual abort (post)", async () => {
            // Simulate two in-flight post requests
            const c1 = transport.post("/foo");
            const c2 = transport.post("/bar");
            expect(activeAbortControllers.size).toBe(2);
            for (const controller of Array.from(activeAbortControllers)) {
                controller.abort();
            }
            await expect(c1).rejects.toThrow();
            await expect(c2).rejects.toThrow();
            expect(activeAbortControllers.size).toBe(0);
        });
    });

    it("should track active requests and remove them after completion (post)", async () => {
        expect(activeRequests.size).toBe(0);
        const p = transport.post("/foo");
        expect(activeRequests.size).toBe(1);
        await p;
        expect(activeRequests.size).toBe(0);
    });

    it("should track and clean up AbortControllers (post)", async () => {
        expect(activeAbortControllers.size).toBe(0);
        const p = transport.post("/foo");
        expect(activeAbortControllers.size).toBe(1);
        await p;
        expect(activeAbortControllers.size).toBe(0);
    });
});
