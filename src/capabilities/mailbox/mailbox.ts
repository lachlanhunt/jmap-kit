import { EMAIL_CAPABILITY_URI } from "../../common/registry.js";
import type { JMAPCapability, JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "../../invocation/types.js";
import type {
    MailboxChangesRequestInvocationArgs,
    MailboxChangesResponseInvocationArgs,
    MailboxGetRequestInvocationArgs,
    MailboxGetResponseInvocationArgs,
    MailboxQueryChangesRequestInvocationArgs,
    MailboxQueryChangesResponseInvocationArgs,
    MailboxQueryRequestInvocationArgs,
    MailboxQueryResponseInvocationArgs,
    MailboxRequestInvocationArgs,
    MailboxResponseInvocationArgs,
    MailboxSetRequestInvocationArgs,
    MailboxSetResponseInvocationArgs,
} from "./types.js";

/**
 * MailboxInvocation represents a JMAP Mailbox capability invocation.
 *
 * The Mailbox data type represents folders/mailboxes for organising email messages. It supports
 * standard JMAP methods for retrieving, querying, and modifying mailbox structures.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-2 | RFC 8621 Section 2: Mailboxes}
 */
export class MailboxInvocation<
    TArgs extends MailboxRequestInvocationArgs | MailboxResponseInvocationArgs,
> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return EMAIL_CAPABILITY_URI;
    }

    /**
     * Constructs a MailboxInvocation
     *
     * @param method The name of the method being invoked (e.g., "get", "set", "query")
     * @param args The arguments for the method invocation
     * @param methodCallId An optional unique symbol to identify this method call for result referencing
     */
    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("Mailbox", method, args, methodCallId);
    }

    /**
     * Create an invocation factory function
     *
     * @param method The name of the method to create
     * @returns A new Mailbox invocation factory function for creating invocations of the specified type
     */
    static createInvocationFactory<TArgs extends MailboxRequestInvocationArgs | MailboxResponseInvocationArgs>(
        method: JMAPMethodName,
    ): InvocationFactory<TArgs, MailboxInvocation<TArgs>> {
        /**
         * An invocation factory function to create a `Mailbox/{method}` invocation`.
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         */
        return (args, methodCallId) => new MailboxInvocation<TArgs>(method, args, methodCallId);
    }
}

export const Mailbox = {
    request: {
        /**
         * Retrieves Mailbox objects by their IDs.
         *
         * @param args The invocation arguments for Mailbox/get
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A MailboxInvocation representing the Mailbox/get request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-2.1 | RFC 8621 Section 2.1: Mailbox/get}
         */
        get: MailboxInvocation.createInvocationFactory<MailboxGetRequestInvocationArgs>("get"),
        /**
         * Returns changes to Mailbox objects since a given state.
         *
         * @param args The invocation arguments for Mailbox/changes
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A MailboxInvocation representing the Mailbox/changes request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-2.2 | RFC 8621 Section 2.2: Mailbox/changes}
         */
        changes: MailboxInvocation.createInvocationFactory<MailboxChangesRequestInvocationArgs>("changes"),
        /**
         * Queries for Mailbox objects matching specified criteria.
         *
         * @param args The invocation arguments for Mailbox/query
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A MailboxInvocation representing the Mailbox/query request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-2.3 | RFC 8621 Section 2.3: Mailbox/query}
         */
        query: MailboxInvocation.createInvocationFactory<MailboxQueryRequestInvocationArgs>("query"),
        /**
         * Returns changes to a query result since a given state.
         *
         * @param args The invocation arguments for Mailbox/queryChanges
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A MailboxInvocation representing the Mailbox/queryChanges request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-2.4 | RFC 8621 Section 2.4: Mailbox/queryChanges}
         */
        queryChanges:
            MailboxInvocation.createInvocationFactory<MailboxQueryChangesRequestInvocationArgs>("queryChanges"),
        /**
         * Creates, updates, or destroys Mailbox objects.
         *
         * @param args The invocation arguments for Mailbox/set
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A MailboxInvocation representing the Mailbox/set request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-2.5 | RFC 8621 Section 2.5: Mailbox/set}
         */
        set: MailboxInvocation.createInvocationFactory<MailboxSetRequestInvocationArgs>("set"),
    },
    response: {
        get: MailboxInvocation.createInvocationFactory<MailboxGetResponseInvocationArgs>("get"),
        changes: MailboxInvocation.createInvocationFactory<MailboxChangesResponseInvocationArgs>("changes"),
        query: MailboxInvocation.createInvocationFactory<MailboxQueryResponseInvocationArgs>("query"),
        queryChanges:
            MailboxInvocation.createInvocationFactory<MailboxQueryChangesResponseInvocationArgs>("queryChanges"),
        set: MailboxInvocation.createInvocationFactory<MailboxSetResponseInvocationArgs>("set"),
    },
} satisfies InvocationFactoryCollection;
