import type { JMAPCapability, JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "../../invocation/types.js";
import type {
    ExampleEchoRequestInvocationArgs,
    ExampleGetRequestInvocationArgs,
    ExampleGetResponseInvocationArgs,
    ExampleInvocationArgs,
    ExampleQueryRequestInvocationArgs,
    ExampleQueryResponseInvocationArgs,
    ExampleSetRequestInvocationArgs,
    ExampleSetResponseInvocationArgs,
} from "./types.js";

/**
 * ExampleInvocation represents an illustrative example JMAP capability invocation.
 *
 * This capability serves as a reference implementation demonstrating how to define custom
 * invocations in this library. It implements standard JMAP method patterns (echo, get, set, query)
 * and is used internally for testing the invocation framework, request building, and response handling.
 *
 * **Note:** This is not a real JMAP invocation - it exists purely for documentation and testing purposes.
 */
export class ExampleInvocation<TArgs extends ExampleInvocationArgs> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return "urn:example";
    }

    /**
     * Constructs an ExampleInvocation
     *
     * @param method The name of the method being invoked (e.g., "echo", "get", "set", "query")
     * @param args The arguments for the method invocation
     * @param methodCallId An optional unique symbol to identify this method call for result referencing
     */
    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("Example", method, args, methodCallId);
    }

    /**
     * Create an invocation factory function
     *
     * @param method The name of the method to create
     * @returns A new Example invocation factory function for creating invocations of the specified type
     */
    static createInvocationFactory<TArgs extends ExampleInvocationArgs>(
        method: JMAPMethodName,
    ): InvocationFactory<TArgs, ExampleInvocation<TArgs>> {
        /**
         * An invocation factory function to create an `Example/*` invocation for the specified `method`
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         */
        return (args, methodCallId) => new ExampleInvocation<TArgs>(method, args, methodCallId);
    }
}

export const Example = {
    request: {
        /**
         * An example echo method that returns the same arguments it receives.
         *
         * This method demonstrates a simple request-only pattern used for testing.
         *
         * @param args The invocation arguments for Example/echo
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An ExampleInvocation representing the Example/echo request
         */
        echo: ExampleInvocation.createInvocationFactory<ExampleEchoRequestInvocationArgs>("echo"),
        /**
         * An example get method that retrieves Example objects by their IDs.
         *
         * This method demonstrates the standard JMAP /get pattern used for testing.
         *
         * @param args The invocation arguments for Example/get
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An ExampleInvocation representing the Example/get request
         */
        get: ExampleInvocation.createInvocationFactory<ExampleGetRequestInvocationArgs>("get"),
        /**
         * An example set method that creates, updates, or destroys Example objects.
         *
         * This method demonstrates the standard JMAP /set pattern used for testing.
         *
         * @param args The invocation arguments for Example/set
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An ExampleInvocation representing the Example/set request
         */
        set: ExampleInvocation.createInvocationFactory<ExampleSetRequestInvocationArgs>("set"),
        /**
         * An example query method that searches for Example objects matching criteria.
         *
         * This method demonstrates the standard JMAP /query pattern used for testing.
         *
         * @param args The invocation arguments for Example/query
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An ExampleInvocation representing the Example/query request
         */
        query: ExampleInvocation.createInvocationFactory<ExampleQueryRequestInvocationArgs>("query"),
    },
    response: {
        get: ExampleInvocation.createInvocationFactory<ExampleGetResponseInvocationArgs>("get"),
        set: ExampleInvocation.createInvocationFactory<ExampleSetResponseInvocationArgs>("set"),
        query: ExampleInvocation.createInvocationFactory<ExampleQueryResponseInvocationArgs>("query"),
    },
} satisfies InvocationFactoryCollection;
