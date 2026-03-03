import { CORE_CAPABILITY_URI } from "../../common/registry.js";
import type { JMAPCapability, JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "../../invocation/types.js";
import type { CoreEchoRequestInvocationArgs, CoreEchoResponseInvocationArgs, CoreInvocationArgs } from "./types.js";

/**
 * CoreInvocation represents a JMAP Core capability invocation.
 *
 * The Core data type only exposes the `/echo` method and must be supported by all JMAP servers.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-4 | RFC 8620 Section 4: The Core/echo Method}
 */
export class CoreInvocation<TArgs extends CoreInvocationArgs> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return CORE_CAPABILITY_URI;
    }

    /**
     * Constructs a CoreInvocation
     *
     * @param method The name of the method being invoked (e.g., "echo")
     * @param args The arguments for the method invocation
     * @param methodCallId An optional unique symbol to identify this method call for result referencing
     */
    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("Core", method, args, methodCallId);
    }

    /**
     * Create an invocation factory function
     *
     * @param method The name of the method to create
     * @returns A new Core invocation factory function for creating invocations of the specified type
     */
    static createInvocationFactory<TArgs extends CoreInvocationArgs>(
        method: JMAPMethodName,
    ): InvocationFactory<TArgs, CoreInvocation<TArgs>> {
        /**
         * An invocation factory function to create a `Core/*` invocation for the specified `method`
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         */
        return (args, methodCallId) => new CoreInvocation<TArgs>(method, args, methodCallId);
    }
}

export const Core = {
    request: {
        /**
         * The Core/echo method returns exactly the same arguments as it is given. It is useful for
         * testing if you have a valid authenticated connection to a JMAP API endpoint.
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-4 | RFC 8620 Section 4: The Core/echo Method}
         */
        echo: CoreInvocation.createInvocationFactory<CoreEchoRequestInvocationArgs>("echo"),
    },
    response: {
        echo: CoreInvocation.createInvocationFactory<CoreEchoResponseInvocationArgs>("echo"),
    },
} satisfies InvocationFactoryCollection;
