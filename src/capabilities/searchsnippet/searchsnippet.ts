import { EMAIL_CAPABILITY_URI } from "../../common/registry.js";
import type { JMAPCapability, JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "../../invocation/types.js";
import type {
    SearchSnippetGetRequestInvocationArgs,
    SearchSnippetGetResponseInvocationArgs,
    SearchSnippetRequestInvocationArgs,
    SearchSnippetResponseInvocationArgs,
} from "./types.js";

/**
 * SearchSnippetInvocation represents a JMAP SearchSnippet capability invocation.
 *
 * When doing a search on a string property, the client may wish to show the relevant section
 * of the body that matches the search as a preview and to highlight any matching terms in both
 * this and the subject of the Email.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-5 | RFC 8621 Section 5: Search Snippets}
 */
export class SearchSnippetInvocation<
    TArgs extends SearchSnippetRequestInvocationArgs | SearchSnippetResponseInvocationArgs,
> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return EMAIL_CAPABILITY_URI;
    }

    /**
     * Constructs a SearchSnippetInvocation
     *
     * @param method The name of the method being invoked
     * @param args The arguments for the method invocation
     * @param methodCallId An optional unique symbol to identify this method call for result referencing
     */
    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("SearchSnippet", method, args, methodCallId);
    }

    /**
     * Create an invocation factory function
     *
     * @param method The name of the method to create
     * @returns A new SearchSnippet invocation factory function for creating invocations of the specified type
     */
    static createInvocationFactory<
        TArgs extends SearchSnippetRequestInvocationArgs | SearchSnippetResponseInvocationArgs,
    >(method: JMAPMethodName): InvocationFactory<TArgs, SearchSnippetInvocation<TArgs>> {
        /**
         * An invocation factory function to create a `SearchSnippet/{method}` invocation.
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         */
        return (args, methodCallId) => new SearchSnippetInvocation<TArgs>(method, args, methodCallId);
    }
}

export const SearchSnippet = {
    request: {
        /**
         * Fetches search snippets for the given Email ids matching the given filter.
         *
         * This is NOT a standard `/get` method. The `ids` argument is replaced by `emailIds`,
         * and an additional `filter` argument is required (the same filter as passed to `Email/query`).
         *
         * @param args The invocation arguments for SearchSnippet/get
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A SearchSnippetInvocation representing the SearchSnippet/get request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-5.1 | RFC 8621 Section 5.1: SearchSnippet/get}
         */
        get: SearchSnippetInvocation.createInvocationFactory<SearchSnippetGetRequestInvocationArgs>("get"),
    },
    response: {
        get: SearchSnippetInvocation.createInvocationFactory<SearchSnippetGetResponseInvocationArgs>("get"),
    },
} satisfies InvocationFactoryCollection;
