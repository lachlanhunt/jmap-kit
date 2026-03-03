import type { HeadersInit } from "../types.js";

/**
 * Merges two Headers objects, respecting known single-value and multi-value headers.
 * If a single-value header appears in both, the value from the second Headers object will override the first.
 * Multi-value headers will combine values from both Headers objects, ensuring no duplicates.
 *
 * @param h1 The first set of headers.
 * @param h2 The second set of headers.
 * @returns A new Headers object containing the merged headers.
 */
export function mergeHeaders(h1: HeadersInit, h2: HeadersInit): Headers {
    const result = new Headers(h1);
    const newHeaders = new Headers(h2);

    // Known single-value headers (case-insensitive)
    const singleValueRequestHeaders = new Set([
        "authorization",
        "content-disposition",
        "content-encoding",
        "content-language",
        "content-location",
        "content-type",
        "if-match",
        "if-modified-since",
        "if-none-match",
        "if-unmodified-since",
    ]);

    for (const [key, value] of newHeaders) {
        const lowerKey = key.toLowerCase();

        if (singleValueRequestHeaders.has(lowerKey)) {
            result.set(key, value); // override
        } else {
            const existing = new Set(result.get(key)?.split(/\s*,\s*/) ?? []);
            const values = new Set(value.split(/\s*,\s*/));
            const combined = existing.union(values);
            result.set(key, Array.from(combined).join(", "));
        }
    }

    return result;
}
