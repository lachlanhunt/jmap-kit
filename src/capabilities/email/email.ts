import { EMAIL_CAPABILITY_URI } from "../../common/registry.js";
import type { JMAPCapability, JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "../../invocation/types.js";
import type {
    EmailChangesRequestInvocationArgs,
    EmailChangesResponseInvocationArgs,
    EmailCopyRequestInvocationArgs,
    EmailCopyResponseInvocationArgs,
    EmailGetRequestInvocationArgs,
    EmailGetResponseInvocationArgs,
    EmailImportRequestInvocationArgs,
    EmailImportResponseInvocationArgs,
    EmailParseRequestInvocationArgs,
    EmailParseResponseInvocationArgs,
    EmailQueryChangesRequestInvocationArgs,
    EmailQueryChangesResponseInvocationArgs,
    EmailQueryRequestInvocationArgs,
    EmailQueryResponseInvocationArgs,
    EmailRequestInvocationArgs,
    EmailResponseInvocationArgs,
    EmailSetRequestInvocationArgs,
    EmailSetResponseInvocationArgs,
} from "./types.js";

/**
 * EmailInvocation represents a JMAP Email capability invocation.
 *
 * The Email data type represents email messages as defined in RFC 8621. It supports standard
 * JMAP methods for retrieving, querying, copying, modifying, importing, and parsing email messages.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4 | RFC 8621 Section 4: Emails}
 */
export class EmailInvocation<TArgs extends EmailRequestInvocationArgs> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return EMAIL_CAPABILITY_URI;
    }

    /**
     * Constructs an EmailInvocation
     *
     * @param method The name of the method being invoked (e.g., "get", "set", "query")
     * @param args The arguments for the method invocation
     * @param methodCallId An optional unique symbol to identify this method call for result referencing
     */
    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("Email", method, args, methodCallId);
    }
    /**
     * Create an invocation factory function
     *
     * @param method The name of the method to create
     * @returns A new Email invocation factory function for creating invocations of the specified type
     */
    static createInvocationFactory<TArgs extends EmailRequestInvocationArgs | EmailResponseInvocationArgs>(
        method: JMAPMethodName,
    ): InvocationFactory<TArgs, EmailInvocation<TArgs>> {
        /**
         * An invocation factory function to create a `Email/*` invocation for the specified `method`
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         */
        return (args, methodCallId) => new EmailInvocation<TArgs>(method, args, methodCallId);
    }
}

export const Email = {
    request: {
        /**
         * Retrieves Email objects by their IDs.
         *
         * @param args The invocation arguments for Email/get
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailInvocation representing the Email/get request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.2 | RFC 8621 Section 4.2: Email/get}
         */
        get: EmailInvocation.createInvocationFactory<EmailGetRequestInvocationArgs>("get"),
        /**
         * Returns changes to Email objects since a given state.
         *
         * @param args The invocation arguments for Email/changes
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailInvocation representing the Email/changes request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.3 | RFC 8621 Section 4.3: Email/changes}
         */
        changes: EmailInvocation.createInvocationFactory<EmailChangesRequestInvocationArgs>("changes"),
        /**
         * Queries for Email objects matching specified criteria.
         *
         * @param args The invocation arguments for Email/query
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailInvocation representing the Email/query request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.4 | RFC 8621 Section 4.4: Email/query}
         */
        query: EmailInvocation.createInvocationFactory<EmailQueryRequestInvocationArgs>("query"),
        /**
         * Returns changes to a query result since a given state.
         *
         * @param args The invocation arguments for Email/queryChanges
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailInvocation representing the Email/queryChanges request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.5 | RFC 8621 Section 4.5: Email/queryChanges}
         */
        queryChanges: EmailInvocation.createInvocationFactory<EmailQueryChangesRequestInvocationArgs>("queryChanges"),
        /**
         * Copies Email objects from one account to another.
         *
         * @param args The invocation arguments for Email/copy
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailInvocation representing the Email/copy request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.7 | RFC 8621 Section 4.7: Email/copy}
         */
        copy: EmailInvocation.createInvocationFactory<EmailCopyRequestInvocationArgs>("copy"),
        /**
         * Creates, updates, or destroys Email objects.
         *
         * @param args The invocation arguments for Email/set
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailInvocation representing the Email/set request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.6 | RFC 8621 Section 4.6: Email/set}
         */
        set: EmailInvocation.createInvocationFactory<EmailSetRequestInvocationArgs>("set"),
        /**
         * Imports email messages from raw RFC 5322 message data.
         *
         * @param args The invocation arguments for Email/import
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailInvocation representing the Email/import request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.8 | RFC 8621 Section 4.8: Email/import}
         */
        import: EmailInvocation.createInvocationFactory<EmailImportRequestInvocationArgs>("import"),
        /**
         * Parses email messages to extract structured information without importing them.
         *
         * @param args The invocation arguments for Email/parse
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailInvocation representing the Email/parse request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.9 | RFC 8621 Section 4.9: Email/parse}
         */
        parse: EmailInvocation.createInvocationFactory<EmailParseRequestInvocationArgs>("parse"),
    },
    response: {
        get: EmailInvocation.createInvocationFactory<EmailGetResponseInvocationArgs>("get"),
        changes: EmailInvocation.createInvocationFactory<EmailChangesResponseInvocationArgs>("changes"),
        query: EmailInvocation.createInvocationFactory<EmailQueryResponseInvocationArgs>("query"),
        queryChanges: EmailInvocation.createInvocationFactory<EmailQueryChangesResponseInvocationArgs>("queryChanges"),
        copy: EmailInvocation.createInvocationFactory<EmailCopyResponseInvocationArgs>("copy"),
        set: EmailInvocation.createInvocationFactory<EmailSetResponseInvocationArgs>("set"),
        import: EmailInvocation.createInvocationFactory<EmailImportResponseInvocationArgs>("import"),
        parse: EmailInvocation.createInvocationFactory<EmailParseResponseInvocationArgs>("parse"),
    },
} satisfies InvocationFactoryCollection;
