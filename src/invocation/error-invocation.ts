import type { JMAPResponseInvocationErrorArgs, JSONValue } from "../common/types.js";

/**
 * Represents a JMAP method-level error invocation.
 *
 * This class encapsulates error responses from the JMAP server, providing a similar interface
 * to Invocation, but with no dataType property. The error arguments are stored as a map and
 * can be accessed via the `arguments` getter. The error type is available via the `type` getter.
 */
export class ErrorInvocation {
    /** Map of error argument keys to their values. */
    readonly #arguments: Map<keyof JMAPResponseInvocationErrorArgs & string, JSONValue>;
    /** The unique symbol identifier for this error invocation. */
    readonly #id: symbol;

    /**
     * Construct a new ErrorInvocation.
     * @param args The error arguments, including the required `type` property.
     * @param methodCallId The unique symbol for this invocation (optional; a new symbol is generated if omitted).
     */
    constructor(args: JMAPResponseInvocationErrorArgs, methodCallId?: symbol) {
        this.#arguments = new Map(Object.entries(args));
        this.#id = methodCallId ?? Symbol();
    }
    /** The name of this invocation, always "error". */
    get name() {
        return "error" as const;
    }

    /** The error arguments as a plain object. */
    get arguments() {
        return Object.fromEntries(this.#arguments);
    }

    /** The unique symbol identifier for this error invocation. */
    get id() {
        return this.#id;
    }

    /** The error type string (e.g., "serverFail", "invalidArguments"). */
    get type() {
        return this.#arguments.get("type") as JMAPResponseInvocationErrorArgs["type"];
    }
}
