import { SUBMISSION_CAPABILITY_URI } from "../../common/registry.js";
import type { JMAPCapability, JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "../../invocation/types.js";
import type {
    EmailSubmissionChangesRequestInvocationArgs,
    EmailSubmissionChangesResponseInvocationArgs,
    EmailSubmissionGetRequestInvocationArgs,
    EmailSubmissionGetResponseInvocationArgs,
    EmailSubmissionQueryChangesRequestInvocationArgs,
    EmailSubmissionQueryChangesResponseInvocationArgs,
    EmailSubmissionQueryRequestInvocationArgs,
    EmailSubmissionQueryResponseInvocationArgs,
    EmailSubmissionRequestInvocationArgs,
    EmailSubmissionResponseInvocationArgs,
    EmailSubmissionSetRequestInvocationArgs,
    EmailSubmissionSetResponseInvocationArgs,
} from "./types.js";

/**
 * EmailSubmissionInvocation represents a JMAP EmailSubmission capability invocation.
 *
 * An EmailSubmission object represents the submission of an Email for delivery to one or more
 * recipients. It supports standard JMAP methods for retrieving, querying, and modifying submissions.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7 | RFC 8621 Section 7: Email Submission}
 */
export class EmailSubmissionInvocation<
    TArgs extends EmailSubmissionRequestInvocationArgs | EmailSubmissionResponseInvocationArgs,
> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return SUBMISSION_CAPABILITY_URI;
    }

    /**
     * Constructs an EmailSubmissionInvocation
     *
     * @param method The name of the method being invoked (e.g., "get", "set", "query")
     * @param args The arguments for the method invocation
     * @param methodCallId An optional unique symbol to identify this method call for result referencing
     */
    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("EmailSubmission", method, args, methodCallId);
    }

    /**
     * Create an invocation factory function
     *
     * @param method The name of the method to create
     * @returns A new EmailSubmission invocation factory function for creating invocations of the specified type
     */
    static createInvocationFactory<
        TArgs extends EmailSubmissionRequestInvocationArgs | EmailSubmissionResponseInvocationArgs,
    >(method: JMAPMethodName): InvocationFactory<TArgs, EmailSubmissionInvocation<TArgs>> {
        /**
         * An invocation factory function to create an `EmailSubmission/{method}` invocation.
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         */
        return (args, methodCallId) => new EmailSubmissionInvocation<TArgs>(method, args, methodCallId);
    }
}

export const EmailSubmission = {
    request: {
        /**
         * Retrieves EmailSubmission objects by their IDs.
         *
         * @param args The invocation arguments for EmailSubmission/get
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailSubmissionInvocation representing the EmailSubmission/get request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7.1 | RFC 8621 Section 7.1: EmailSubmission/get}
         */
        get: EmailSubmissionInvocation.createInvocationFactory<EmailSubmissionGetRequestInvocationArgs>("get"),
        /**
         * Returns changes to EmailSubmission objects since a given state.
         *
         * @param args The invocation arguments for EmailSubmission/changes
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailSubmissionInvocation representing the EmailSubmission/changes request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7.2 | RFC 8621 Section 7.2: EmailSubmission/changes}
         */
        changes:
            EmailSubmissionInvocation.createInvocationFactory<EmailSubmissionChangesRequestInvocationArgs>("changes"),
        /**
         * Queries for EmailSubmission objects matching specified criteria.
         *
         * @param args The invocation arguments for EmailSubmission/query
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailSubmissionInvocation representing the EmailSubmission/query request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7.3 | RFC 8621 Section 7.3: EmailSubmission/query}
         */
        query: EmailSubmissionInvocation.createInvocationFactory<EmailSubmissionQueryRequestInvocationArgs>("query"),
        /**
         * Returns changes to a query result since a given state.
         *
         * @param args The invocation arguments for EmailSubmission/queryChanges
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailSubmissionInvocation representing the EmailSubmission/queryChanges request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7.4 | RFC 8621 Section 7.4: EmailSubmission/queryChanges}
         */
        queryChanges:
            EmailSubmissionInvocation.createInvocationFactory<EmailSubmissionQueryChangesRequestInvocationArgs>(
                "queryChanges",
            ),
        /**
         * Creates, updates, or destroys EmailSubmission objects.
         *
         * An Email is sent by creating an EmailSubmission object. Additional `onSuccessUpdateEmail`
         * and `onSuccessDestroyEmail` arguments allow updating or destroying the referenced Email
         * upon successful submission.
         *
         * @param args The invocation arguments for EmailSubmission/set
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An EmailSubmissionInvocation representing the EmailSubmission/set request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7.5 | RFC 8621 Section 7.5: EmailSubmission/set}
         */
        set: EmailSubmissionInvocation.createInvocationFactory<EmailSubmissionSetRequestInvocationArgs>("set"),
    },
    response: {
        get: EmailSubmissionInvocation.createInvocationFactory<EmailSubmissionGetResponseInvocationArgs>("get"),
        changes:
            EmailSubmissionInvocation.createInvocationFactory<EmailSubmissionChangesResponseInvocationArgs>("changes"),
        query: EmailSubmissionInvocation.createInvocationFactory<EmailSubmissionQueryResponseInvocationArgs>("query"),
        queryChanges:
            EmailSubmissionInvocation.createInvocationFactory<EmailSubmissionQueryChangesResponseInvocationArgs>(
                "queryChanges",
            ),
        set: EmailSubmissionInvocation.createInvocationFactory<EmailSubmissionSetResponseInvocationArgs>("set"),
    },
} satisfies InvocationFactoryCollection;
