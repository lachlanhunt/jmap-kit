import type { Transport, TransportRequestOptions } from "../types.js";
import { createAbortController } from "./abort-controller.js";
import { trackAbortController, trackPromise } from "./track-utils.js";

/**
 * Wrap a Transport implementation so that all requests and abort controllers are tracked in the provided Sets.
 * Each request promise is added to the set and removed when settled.
 * Each AbortController is tracked and removed when aborted.
 *
 * @param transport The original Transport implementation.
 * @param activeRequests The Set to track all active (not yet settled) request promises.
 * @param activeAbortControllers The Set to track all active (not yet aborted) AbortControllers.
 * @returns A new Transport that tracks all requests and abort controllers.
 */
export function createTransport(
    transport: Transport,
    activeRequests: Set<Promise<unknown>>,
    activeAbortControllers: Set<AbortController>,
): Transport {
    function createChainedAbortController(externalSignal?: AbortSignal): AbortController {
        const controller = createAbortController(externalSignal);
        return trackAbortController(activeAbortControllers, controller);
    }

    // Overloads for wrapMethod
    function wrapMethod<T>(
        method: "get",
    ): (url: string | URL, options?: Omit<TransportRequestOptions, "body">) => Promise<T>;
    function wrapMethod<T>(method: "post"): (url: string | URL, options?: TransportRequestOptions) => Promise<T>;
    function wrapMethod<T>(method: "get" | "post") {
        return (
            url: string | URL,
            options: TransportRequestOptions | Omit<TransportRequestOptions, "body"> = {},
        ): Promise<T> => {
            const controller = createChainedAbortController(options.signal);
            const promise = (async () => {
                try {
                    return await transport[method]<T>(url, { ...options, signal: controller.signal });
                } finally {
                    activeAbortControllers.delete(controller);
                }
            })();
            return trackPromise(activeRequests, promise);
        };
    }

    const wrapped: Transport = {
        get: wrapMethod("get"),
        post: wrapMethod("post"),
    };

    return wrapped;
}
