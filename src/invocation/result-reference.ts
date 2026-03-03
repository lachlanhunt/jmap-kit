import type { Id, JMAPResultReference } from "../common/types.js";
import type { JMAPResultReferenceInternal, ResultReferenceInterface } from "./types.js";

/**
 * Represents a JMAP result reference that allows one method call to reference
 * the result of a previous method call within the same request.
 *
 * Result references are a core feature of JMAP (RFC 8620 Section 3.7) that enable
 * method calls to depend on the results of earlier method calls in the same request.
 * This allows for efficient batching of interdependent operations without requiring
 * multiple round trips to the server.
 *
 * @remarks
 * This class is primarily used internally by the JMAP client and invocation system.
 * Users typically create result references through invocation method arguments that
 * accept {@linkcode ResultReferenceInterface} objects.
 *
 * A result reference consists of:
 * - An invocation ID (symbol) that uniquely identifies the method call being referenced
 * - A method name to validate the reference type
 * - A JSON Pointer path (RFC 6901) to extract a specific value from the result
 *
 * @example
 * ```ts
 * // Create a result reference to the "id" property from a previous "Foo/set" call
 * const ref = new ResultReference(invocationId, "Foo/set", "/id");
 *
 * // The reference can be resolved to a JMAP result reference format
 * const jmapRef = ref.resolve(lookupFunction);
 * // Returns: { resultOf: "c1", name: "Foo/set", path: "/id" }
 * ```
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-3.7 | RFC 8620 Section 3.7: References to Previous Method Results}
 */
export class ResultReference implements ResultReferenceInterface {
    readonly #id: symbol;
    readonly #name: string;
    readonly #path: string;

    /**
     * Constructs a ResultReference
     *
     * @param id - A unique symbol identifying the invocation being referenced
     * @param name - The name of the method call being referenced (e.g., "Foo/set")
     * @param path - A JSON Pointer (RFC 6901) path to the value in the result (e.g., "/id")
     */
    constructor(id: symbol, name: string, path: string) {
        this.#id = id;
        this.#name = name;
        this.#path = path;
    }

    /**
     * Get the method name of the invocation being referenced
     */
    get name() {
        return this.#name;
    }

    /**
     * Get the unique identifier symbol for the invocation being referenced
     */
    get id() {
        return this.#id;
    }

    /**
     * Get the JSON Pointer path to the value in the referenced result
     */
    get path() {
        return this.#path;
    }

    /**
     * Resolves this result reference to a JMAP result reference format
     *
     * Converts the internal symbol-based invocation ID to a string invocation ID
     * suitable for serialisation in a JMAP request.
     *
     * @param lookupId - A function that maps the invocation symbol to its string ID
     * @returns A JMAP result reference object with resultOf, name, and path properties
     * @throws {Error} If the invocation ID cannot be resolved (invocation not found in request)
     *
     * @example
     * ```ts
     * const ref = new ResultReference(invocationId, "Foo/set", "/id");
     * const jmapRef = ref.resolve(id => idMap.get(id));
     * // Returns: { resultOf: "c1", name: "Foo/set", path: "/id" }
     * ```
     */
    resolve(lookupId: (id: symbol) => Id | undefined): JMAPResultReference {
        const name = this.#name;
        const path = this.#path;
        const resultOf = lookupId(this.#id);

        if (!resultOf) {
            throw new Error(
                `Failed to resolve id for reference ${JSON.stringify({
                    name,
                    path,
                })}`,
            );
        }

        return {
            name,
            path,
            resultOf,
        };
    }

    /**
     * Serialises this result reference to an internal JSON format
     *
     * Produces a JSON-serialisable representation that preserves the symbol-based
     * invocation ID for internal use. This is used during the pre-serialisation
     * phase before invocation IDs are resolved to strings.
     *
     * @returns An internal result reference object with the symbol ID
     *
     * @internal
     */
    toJSON(): JMAPResultReferenceInternal {
        return {
            resultOf: this.#id,
            name: this.#name,
            path: this.#path,
        };
    }
}
