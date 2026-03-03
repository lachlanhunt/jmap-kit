import type {
    JMAPCapability,
    JMAPDataType,
    JMAPMethodName,
    JMAPRequestInvocation,
    JMAPResultReference,
    JSONValue,
} from "../common/types.js";
import { createArgumentsProxy } from "./arguments-proxy.js";
import { ResultReference } from "./result-reference.js";
import type { BaseInvocationArgs, InvocationArgs, InvocationInterface, JMAPInvocationInternal } from "./types.js";
import { isResultReference } from "./utils.js";

/**
 * Base class for invocations.
 * @remarks
 * This class is not meant to be constructed directly. Instead, use one of the capabilities subclasses,
 * or extend it to build a new capability.
 * @typeParam TArgs The type of the arguments for the invocation
 */
export abstract class Invocation<TArgs extends BaseInvocationArgs> implements InvocationInterface<TArgs> {
    readonly #dataType: JMAPDataType;
    readonly #method: JMAPMethodName;
    readonly #arguments: Map<keyof TArgs & string, JSONValue | ResultReference>;
    readonly #id: symbol;
    #argumentsProxy: TArgs | null = null;

    abstract readonly uri: JMAPCapability;

    /**
     * Constructs an Invocation
     *
     * @param dataType The data type of the invocation
     * @param method The name of the method being invoked (e.g., "get", "set", "query")
     * @param args object containing named arguments for that method or response
     * @throws {InvalidResultReferenceError}
     * @throws {UnexpectedResultReferenceError}
     */
    constructor(dataType: JMAPDataType, method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        this.#dataType = dataType;
        this.#method = method;
        this.#arguments = new Map(Object.entries(args));
        this.#id = methodCallId ?? Symbol();
    }

    /**
     * Get the name of the method
     *
     * The name of the method in the format "{dataType}/{method}"
     */
    get name() {
        return `${this.#dataType}/${this.#method}`;
    }

    /**
     * Get the data type of the invocation
     *
     * The data type of the invocation is the name of the object that methods are associated with
     * (e.g., "Email", "Mailbox", "Thread")
     */
    get dataType() {
        return this.#dataType;
    }

    /**
     * Get the method name of the invocation
     *
     * The method name of the invocation is the name of the method being invoked (e.g., "get", "set", "query")
     */
    get method() {
        return this.#method;
    }

    /**
     * Get the internal identifier for the invocation
     *
     * The internal identifier is a unique symbol used to identify this invocation instance.
     */
    get id() {
        return this.#id;
    }

    /**
     * Get the arguments for the invocation
     *
     * The arguments are the named parameters passed to the method being invoked.
     */
    get arguments() {
        this.#argumentsProxy ??= createArgumentsProxy<TArgs>(this);
        return this.#argumentsProxy;
    }

    /**
     * Get the value of a named argument.
     * @param name The name of the argument
     * @returns The value or result reference for the named argument.
     */
    getArgument<K extends keyof TArgs & string>(name: K) {
        return this.#arguments.get(name) as TArgs[K];
    }

    /**
     * Set the value of a named argument.
     * @param name The name of the argument
     * @param value The value or result reference for the named argument.
     */
    setArgument<K extends keyof TArgs & string>(name: K, value: InvocationArgs<TArgs>[K]) {
        if (isResultReference(value) && value.id === this.#id) {
            throw new Error(`Result reference must not reference the invocation itself`);
        }
        this.#arguments.set(name, value);
    }

    /**
     * Delete a named argument.
     * @param name The name of the argument
     * @returns Whether the argument was deleted
     */
    deleteArgument(name: keyof TArgs & string) {
        return this.#arguments.delete(name);
    }

    /**
     * Check if a named argument exists.
     * @param name The name of the argument
     * @returns Whether the argument exists
     */
    hasArgument(name: keyof TArgs & string) {
        return this.#arguments.has(name);
    }

    /**
     * Get the keys of all arguments.
     * @returns An array of argument names
     */
    argumentKeys(): (keyof TArgs & string)[] {
        return [...this.#arguments.keys()];
    }

    /**
     * Create a result reference for a named argument to use in another method.
     * @param path The path to the result to reference
     * @returns The result reference
     */
    createReference(path: string) {
        return new ResultReference(this.#id, this.name, path);
    }

    /**
     * Resolve the invocation into a JMAP request invocation tuple.
     *
     * Converts internal {@link ResultReference} arguments into their wire format
     * (`#property` keys with resolved `resultOf` ids) and produces the
     * `[name, arguments, methodCallId]` tuple expected by the JMAP protocol.
     *
     * @param id The method call id to assign to this invocation in the request
     * @param lookupId A function that resolves an invocation's internal symbol id
     *        to the string method call id assigned in the request
     * @returns The resolved JMAP request invocation tuple
     * @throws If a result reference refers to an invocation whose id cannot be resolved
     */
    resolve(id: string, lookupId: (id: symbol) => string | undefined) {
        const entries = [...this.#arguments];

        const args = Object.fromEntries(
            entries.map<[string, JSONValue | JMAPResultReference]>(([property, value]) => {
                return value instanceof ResultReference ? [`#${property}`, value.resolve(lookupId)] : [property, value];
            }),
        );

        return [this.name, args, id] as JMAPRequestInvocation;
    }

    /**
     * Convert the invocation to a serialisable representation.
     * @returns A serialisable representation of the invocation
     * @remarks It is expected that the caller will provide a resolver function to resolve the ID
     *         and any result references referring to other invocations.
     */
    toJSON(): JMAPInvocationInternal {
        return [
            this.name,
            Object.fromEntries(
                Array.from(this.#arguments.entries(), ([k, v]) =>
                    v instanceof ResultReference ? [`#${k}`, v] : [k, v],
                ),
            ),
            this.#id,
        ];
    }
}
