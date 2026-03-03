import { VACATIONRESPONSE_CAPABILITY_URI } from "../../common/registry.js";
import type { JMAPCapability, JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "../../invocation/types.js";
import type {
    VacationResponseGetRequestInvocationArgs,
    VacationResponseGetResponseInvocationArgs,
    VacationResponseRequestInvocationArgs,
    VacationResponseResponseInvocationArgs,
    VacationResponseSetRequestInvocationArgs,
    VacationResponseSetResponseInvocationArgs,
} from "./types.js";

/**
 * VacationResponseInvocation represents a JMAP VacationResponse capability invocation.
 *
 * A VacationResponse object represents the state of vacation-response-related settings for an
 * account. There is only ever one VacationResponse object, and its id is `singleton`.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-8 | RFC 8621 Section 8: Vacation Response}
 */
export class VacationResponseInvocation<
    TArgs extends VacationResponseRequestInvocationArgs | VacationResponseResponseInvocationArgs,
> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return VACATIONRESPONSE_CAPABILITY_URI;
    }

    /**
     * Constructs a VacationResponseInvocation
     *
     * @param method The name of the method being invoked (e.g., "get", "set")
     * @param args The arguments for the method invocation
     * @param methodCallId An optional unique symbol to identify this method call for result referencing
     */
    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("VacationResponse", method, args, methodCallId);
    }

    /**
     * Create an invocation factory function
     *
     * @param method The name of the method to create
     * @returns A new VacationResponse invocation factory function for creating invocations of the specified type
     */
    static createInvocationFactory<
        TArgs extends VacationResponseRequestInvocationArgs | VacationResponseResponseInvocationArgs,
    >(method: JMAPMethodName): InvocationFactory<TArgs, VacationResponseInvocation<TArgs>> {
        /**
         * An invocation factory function to create a `VacationResponse/{method}` invocation.
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         */
        return (args, methodCallId) => new VacationResponseInvocation<TArgs>(method, args, methodCallId);
    }
}

export const VacationResponse = {
    request: {
        /**
         * Retrieves the VacationResponse object.
         *
         * There MUST only be exactly one VacationResponse object in an account.
         * It MUST have the id `singleton`.
         *
         * @param args The invocation arguments for VacationResponse/get
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A VacationResponseInvocation representing the VacationResponse/get request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-8.1 | RFC 8621 Section 8.1: VacationResponse/get}
         */
        get: VacationResponseInvocation.createInvocationFactory<VacationResponseGetRequestInvocationArgs>("get"),
        /**
         * Updates the VacationResponse object.
         *
         * @param args The invocation arguments for VacationResponse/set
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A VacationResponseInvocation representing the VacationResponse/set request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-8.2 | RFC 8621 Section 8.2: VacationResponse/set}
         */
        set: VacationResponseInvocation.createInvocationFactory<VacationResponseSetRequestInvocationArgs>("set"),
    },
    response: {
        get: VacationResponseInvocation.createInvocationFactory<VacationResponseGetResponseInvocationArgs>("get"),
        set: VacationResponseInvocation.createInvocationFactory<VacationResponseSetResponseInvocationArgs>("set"),
    },
} satisfies InvocationFactoryCollection;
