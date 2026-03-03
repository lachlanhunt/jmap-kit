import { SUBMISSION_CAPABILITY_URI } from "../../common/registry.js";
import type { JMAPCapability, JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "../../invocation/types.js";
import type {
    IdentityChangesRequestInvocationArgs,
    IdentityChangesResponseInvocationArgs,
    IdentityGetRequestInvocationArgs,
    IdentityGetResponseInvocationArgs,
    IdentityRequestInvocationArgs,
    IdentityResponseInvocationArgs,
    IdentitySetRequestInvocationArgs,
    IdentitySetResponseInvocationArgs,
} from "./types.js";

/**
 * IdentityInvocation represents a JMAP Identity capability invocation.
 *
 * An Identity object stores information about an email address or domain the user may send from.
 * It supports standard JMAP methods for retrieving, tracking changes, and modifying identities.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-6 | RFC 8621 Section 6: Identities}
 */
export class IdentityInvocation<
    TArgs extends IdentityRequestInvocationArgs | IdentityResponseInvocationArgs,
> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return SUBMISSION_CAPABILITY_URI;
    }

    /**
     * Constructs an IdentityInvocation
     *
     * @param method The name of the method being invoked (e.g., "get", "set")
     * @param args The arguments for the method invocation
     * @param methodCallId An optional unique symbol to identify this method call for result referencing
     */
    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("Identity", method, args, methodCallId);
    }

    /**
     * Create an invocation factory function
     *
     * @param method The name of the method to create
     * @returns A new Identity invocation factory function for creating invocations of the specified type
     */
    static createInvocationFactory<TArgs extends IdentityRequestInvocationArgs | IdentityResponseInvocationArgs>(
        method: JMAPMethodName,
    ): InvocationFactory<TArgs, IdentityInvocation<TArgs>> {
        /**
         * An invocation factory function to create an `Identity/{method}` invocation.
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         */
        return (args, methodCallId) => new IdentityInvocation<TArgs>(method, args, methodCallId);
    }
}

export const Identity = {
    request: {
        /**
         * Retrieves Identity objects by their IDs.
         *
         * The `ids` argument may be `null` to fetch all at once.
         *
         * @param args The invocation arguments for Identity/get
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An IdentityInvocation representing the Identity/get request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-6.1 | RFC 8621 Section 6.1: Identity/get}
         */
        get: IdentityInvocation.createInvocationFactory<IdentityGetRequestInvocationArgs>("get"),
        /**
         * Returns changes to Identity objects since a given state.
         *
         * @param args The invocation arguments for Identity/changes
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An IdentityInvocation representing the Identity/changes request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-6.2 | RFC 8621 Section 6.2: Identity/changes}
         */
        changes: IdentityInvocation.createInvocationFactory<IdentityChangesRequestInvocationArgs>("changes"),
        /**
         * Creates, updates, or destroys Identity objects.
         *
         * @param args The invocation arguments for Identity/set
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An IdentityInvocation representing the Identity/set request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-6.3 | RFC 8621 Section 6.3: Identity/set}
         */
        set: IdentityInvocation.createInvocationFactory<IdentitySetRequestInvocationArgs>("set"),
    },
    response: {
        get: IdentityInvocation.createInvocationFactory<IdentityGetResponseInvocationArgs>("get"),
        changes: IdentityInvocation.createInvocationFactory<IdentityChangesResponseInvocationArgs>("changes"),
        set: IdentityInvocation.createInvocationFactory<IdentitySetResponseInvocationArgs>("set"),
    },
} satisfies InvocationFactoryCollection;
