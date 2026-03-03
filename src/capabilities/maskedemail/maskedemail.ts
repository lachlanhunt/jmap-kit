import { MASKED_EMAIL_CAPABILITY_URI } from "../../common/registry.js";
import type { JMAPCapability, JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "../../invocation/types.js";
import type {
    MaskedEmailGetRequestInvocationArgs,
    MaskedEmailGetResponseInvocationArgs,
    MaskedEmailRequestInvocationArgs,
    MaskedEmailResponseInvocationArgs,
    MaskedEmailSetRequestInvocationArgs,
    MaskedEmailSetResponseInvocationArgs,
} from "./types.js";

/**
 * MaskedEmailInvocation represents a JMAP MaskedEmail capability invocation.
 *
 * The MaskedEmail data type is a FastMail vendor-specific extension that provides privacy-enhanced
 * email addresses. Masked emails are temporary or permanent forwarding addresses that protect the
 * user's primary email address. This capability supports creating, retrieving, and managing masked
 * email addresses.
 *
 * @see {@link https://www.fastmail.com/dev/#masked-email-api | FastMail Developer Documentation - Masked Email API}
 */
export class MaskedEmailInvocation<
    TArgs extends MaskedEmailRequestInvocationArgs | MaskedEmailResponseInvocationArgs,
> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return MASKED_EMAIL_CAPABILITY_URI;
    }

    /**
     * Constructs a MaskedEmailInvocation
     *
     * @param method The name of the method being invoked (e.g., "get", "set")
     * @param args The arguments for the method invocation
     * @param methodCallId An optional unique symbol to identify this method call for result referencing
     */
    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("MaskedEmail", method, args, methodCallId);
    }

    /**
     * Create an invocation factory function
     *
     * @param method The name of the method to create
     * @returns A new MaskedEmail invocation factory function for creating invocations of the specified type
     */
    static createInvocationFactory<TArgs extends MaskedEmailRequestInvocationArgs | MaskedEmailResponseInvocationArgs>(
        method: JMAPMethodName,
    ): InvocationFactory<TArgs, MaskedEmailInvocation<TArgs>> {
        /**
         * An invocation factory function to create a `MaskedEmail/*` invocation for the specified `method`
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         */
        return (args, methodCallId) => new MaskedEmailInvocation<TArgs>(method, args, methodCallId);
    }
}

export const MaskedEmail = {
    request: {
        /**
         * Retrieves MaskedEmail objects by their IDs.
         *
         * @param args The invocation arguments for MaskedEmail/get
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A MaskedEmailInvocation representing the MaskedEmail/get request
         *
         * @see {@link https://www.fastmail.com/dev/#masked-email-api | FastMail Developer Documentation - Masked Email API}
         */
        get: MaskedEmailInvocation.createInvocationFactory<MaskedEmailGetRequestInvocationArgs>("get"),
        /**
         * Creates, updates, or destroys MaskedEmail objects.
         *
         * @param args The invocation arguments for MaskedEmail/set
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A MaskedEmailInvocation representing the MaskedEmail/set request
         *
         * @see {@link https://www.fastmail.com/dev/#masked-email-api | FastMail Developer Documentation - Masked Email API}
         */
        set: MaskedEmailInvocation.createInvocationFactory<MaskedEmailSetRequestInvocationArgs>("set"),
    },
    response: {
        get: MaskedEmailInvocation.createInvocationFactory<MaskedEmailGetResponseInvocationArgs>("get"),
        set: MaskedEmailInvocation.createInvocationFactory<MaskedEmailSetResponseInvocationArgs>("set"),
    },
} satisfies InvocationFactoryCollection;
