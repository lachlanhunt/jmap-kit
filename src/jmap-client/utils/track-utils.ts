/**
 * Adds a promise to the given Set while it is pending, and automatically removes it once the promise settles (resolves or rejects).
 * Returns a promise that resolves or rejects with the same value as the input promise.
 *
 * @template T The resolved value type of the promise.
 * @param set Set to track the pending promise.
 * @param promise The promise to track.
 * @returns A promise that resolves or rejects with the same value as the input promise.
 */
export async function trackPromise<T>(set: Set<Promise<unknown>>, promise: Promise<T>): Promise<T> {
    set.add(promise);
    try {
        return await promise;
    } finally {
        set.delete(promise);
    }
}

/**
 * Adds an AbortController to the given Set and automatically removes it when it is aborted.
 * Returns the same AbortController instance for chaining or further use.
 *
 * @param set Set to track the AbortController.
 * @param controller The AbortController to track.
 * @returns The same AbortController instance.
 */
export function trackAbortController(set: Set<AbortController>, controller: AbortController): AbortController {
    set.add(controller);
    const cleanup = () => {
        set.delete(controller);
    };
    controller.signal.addEventListener("abort", cleanup, { once: true });
    return controller;
}
