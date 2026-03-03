// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { RequestBuilder } from "../request-builder/request-builder.js"; // For documentation reference only, to avoid circular dependencies
import type { Id } from "./types.js";

/**
 * A generator function that produces unique IDs with an optional prefix. The IDs are generated as
 * strings of incrementing BigInt values, starting from a specified initial value (default is 0).
 * This is used for generating unique identifiers for method calls by the
 * by the {@linkcode RequestBuilder}.
 *
 * @param prefix The prefix to prepend to each generated ID.
 * @param start The initial value for the ID counter.
 * @returns A generator that yields unique IDs as strings with the specified prefix.
 *
 * @example
 * ```ts
 * const gen = idGenerator("c");
 * console.log(gen.next().value); // "c0"
 * console.log(gen.next().value); // "c1"
 * console.log(gen.next().value); // "c2"
 * ```
 */
export function* idGenerator(prefix = "", start: Parameters<typeof BigInt>[0] = 0): Generator<Id, never, never> {
    let id = BigInt(start);

    while (true) {
        yield `${prefix}${id}`;
        id = id + 1n;
    }
}
