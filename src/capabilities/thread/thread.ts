import { EMAIL_CAPABILITY_URI } from "../../common/registry.js";
import type { JMAPCapability, JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "../../invocation/types.js";
import type {
    ThreadChangesRequestInvocationArgs,
    ThreadChangesResponseInvocationArgs,
    ThreadGetRequestInvocationArgs,
    ThreadGetResponseInvocationArgs,
    ThreadRequestInvocationArgs,
    ThreadResponseInvocationArgs,
} from "./types.js";

/**
 * ThreadInvocation represents a JMAP Thread capability invocation.
 *
 * The Thread data type represents a conversation thread containing related email messages.
 * It supports methods for retrieving threads and tracking changes.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-3 | RFC 8621 Section 3: Threads}
 */
export class ThreadInvocation<
    TArgs extends ThreadRequestInvocationArgs | ThreadResponseInvocationArgs,
> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return EMAIL_CAPABILITY_URI;
    }

    /**
     * Constructs a ThreadInvocation
     *
     * @param method The name of the method being invoked (e.g., "get", "changes")
     * @param args The arguments for the method invocation
     * @param methodCallId An optional unique symbol to identify this method call for result referencing
     */
    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("Thread", method, args, methodCallId);
    }

    /**
     * Create an invocation factory function
     *
     * @param method The name of the method to create
     * @returns A new Thread invocation factory function for creating invocations of the specified type
     */
    static createInvocationFactory<TArgs extends ThreadRequestInvocationArgs | ThreadResponseInvocationArgs>(
        method: JMAPMethodName,
    ): InvocationFactory<TArgs, ThreadInvocation<TArgs>> {
        /**
         * An invocation factory function to create a `Thread/{method}` invocation
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         */
        return (args, methodCallId) => new ThreadInvocation<TArgs>(method, args, methodCallId);
    }
}

export const Thread = {
    request: {
        /**
         * Retrieves Thread objects by their IDs.
         *
         * @param args The invocation arguments for Thread/get
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A ThreadInvocation representing the Thread/get request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-3.1 | RFC 8621 Section 3.1: Thread/get}
         */
        get: ThreadInvocation.createInvocationFactory<ThreadGetRequestInvocationArgs>("get"),
        /**
         * Returns changes to Thread objects since a given state.
         *
         * @param args The invocation arguments for Thread/changes
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A ThreadInvocation representing the Thread/changes request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-3.2 | RFC 8621 Section 3.2: Thread/changes}
         */
        changes: ThreadInvocation.createInvocationFactory<ThreadChangesRequestInvocationArgs>("changes"),
    },
    response: {
        get: ThreadInvocation.createInvocationFactory<ThreadGetResponseInvocationArgs>("get"),
        changes: ThreadInvocation.createInvocationFactory<ThreadChangesResponseInvocationArgs>("changes"),
    },
} satisfies InvocationFactoryCollection;
