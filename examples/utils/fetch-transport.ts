import type { JMAPRequestErrorTypes, ProblemDetails } from "../../src/common/types.js";
import type { Transport, TransportRequestOptions } from "../../src/jmap-client/types.js";
import { JMAPRequestError } from "../../src/jmap-client/utils/jmap-request-error.js";

/**
 * Options for creating a fetch transport.
 */
export interface FetchTransportOptions {
    /** Bearer token for Authorization header */
    bearerToken?: string;
}

/**
 * Creates a transport implementation using the Fetch API.
 *
 * @param options Optional configuration for the transport.
 * @returns A Transport implementation using the Fetch API.
 */
export function createFetchTransport(options: FetchTransportOptions = {}): Transport {
    const { bearerToken } = options;

    return {
        get: makeRequestMethod("get", bearerToken),
        post: makeRequestMethod("post", bearerToken),
    };
}

/**
 * Makes a request method function (get or post) with proper error handling.
 *
 * @param method The HTTP method to use.
 * @param bearerToken Optional bearer token for Authorization header.
 * @returns A function that makes requests with the specified method.
 */
function makeRequestMethod(method: "get" | "post", bearerToken?: string) {
    return async <T>(
        url: string | URL,
        options: TransportRequestOptions | Omit<TransportRequestOptions, "body"> = {},
    ): Promise<T> => {
        // Build headers object
        const headers = new Headers(options.headers);

        if (bearerToken) {
            headers.set("Authorization", `Bearer ${bearerToken}`);
        }

        const response = await fetch(url.toString(), {
            method: method.toUpperCase(),
            headers: headers,
            body: "body" in options ? options.body : undefined,
            signal: options.signal,
        });

        // Check if the response is successful
        if (!response.ok) {
            // Try to parse the error as a JMAP request error (RFC 7807)
            try {
                const contentType = response.headers.get("content-type");
                if (contentType?.includes("application/json") || contentType?.includes("application/problem+json")) {
                    const errorData = (await response.json()) as ProblemDetails<JMAPRequestErrorTypes>;

                    // Add status if not already present
                    // Ensure status is set to the HTTP status code
                    errorData.status ??= response.status;

                    throw new JMAPRequestError(errorData);
                }
            } catch (e) {
                // If the error is already a JMAPRequestError, rethrow
                if (e instanceof JMAPRequestError) {
                    throw e;
                }
                // Otherwise fall through to the generic error
            }

            // Generic error for non-JSON errors or parsing failures
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Handle successful response based on expected response type
        const responseType = options.responseType ?? "json";
        if (responseType === "blob") {
            return (await response.blob()) as T;
        }

        return (await response.json()) as T;
    };
}
