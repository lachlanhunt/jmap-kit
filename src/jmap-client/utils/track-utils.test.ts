import { trackAbortController, trackPromise } from "./track-utils.js";

describe("trackPromise", () => {
    it("adds a resolved promise to the set while pending and removes it after resolution", async () => {
        const set = new Set<Promise<unknown>>();
        const p = Promise.resolve(42);
        const tracked = trackPromise(set, p);
        expect(set.size).toBe(1);
        expect(await tracked).toBe(42);
        expect(set.size).toBe(0);
    });

    it("adds a rejected promise to the set while pending and removes it after rejection", async () => {
        const set = new Set<Promise<unknown>>();
        const p = Promise.reject(new Error("fail"));
        const tracked = trackPromise(set, p);
        expect(set.size).toBe(1);
        await expect(tracked).rejects.toThrow("fail");
        expect(set.size).toBe(0);
    });

    it("promise is present in set while pending and removed after resolving", async () => {
        const set = new Set<Promise<unknown>>();
        const { promise, resolve } = Promise.withResolvers<number>();

        const tracked = trackPromise(set, promise);
        expect(set.size).toBe(1);
        resolve(7);
        await tracked;
        expect(set.size).toBe(0);
    });

    it("promise is present in set while pending and removed after rejecting", async () => {
        const set = new Set<Promise<unknown>>();
        const { promise, reject } = Promise.withResolvers<number>();

        const tracked = trackPromise(set, promise);
        expect(set.size).toBe(1);
        reject(new Error("fail"));
        await expect(tracked).rejects.toThrow("fail");
        expect(set.size).toBe(0);
    });
});

describe("trackAbortController", () => {
    it("adds the controller to the set and removes it after abort", () => {
        const set = new Set<AbortController>();
        const controller = new AbortController();
        trackAbortController(set, controller);
        expect(set.has(controller)).toBe(true);
        controller.abort();
        expect(set.has(controller)).toBe(false);
    });

    it("returns the same controller", () => {
        const set = new Set<AbortController>();
        const controller = new AbortController();
        const result = trackAbortController(set, controller);
        expect(result).toBe(controller);
    });
});
