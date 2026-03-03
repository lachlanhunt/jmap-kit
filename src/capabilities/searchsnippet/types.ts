import type { Id } from "../../common/types.js";
import type { FilterCondition, FilterOperator } from "../../invocation/types.js";
import type { EmailFilterCondition } from "../email/types.js";

/**
 * A SearchSnippet object represents a relevant section of the body that matches a search,
 * along with any matching terms highlighted in the subject.
 *
 * Note that unlike most data types, a SearchSnippet DOES NOT have a property called `id`.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-5 | RFC 8621 Section 5: Search Snippets}
 */
export type SearchSnippetObject = {
    /**
     * The Email id the snippet applies to.
     */
    emailId: Id;

    /**
     * If text from the filter matches the subject, this is the subject of the Email with
     * the following transformations:
     *
     * 1. Any instance of `&`, `<`, and `>` MUST be replaced by an appropriate HTML entity.
     *    Other characters MAY also be replaced with an HTML entity form.
     *
     * 2. The matching words/phrases from the filter are wrapped in HTML `<mark></mark>` tags.
     *
     * If the subject does not match text from the filter, this property is `null`.
     */
    subject: string | null;

    /**
     * If text from the filter matches the plaintext or HTML body, this is the relevant section
     * of the body (converted to plaintext if originally HTML), with the same transformations as
     * the `subject` property. It MUST NOT be bigger than 255 octets in size. If the body does
     * not contain a match for the text from the filter, this property is `null`.
     */
    preview: string | null;
};

/**
 * The arguments for fetching SearchSnippet objects via a `SearchSnippet/get` call.
 *
 * This is NOT a standard `/get` method. It takes a filter (the same as passed to `Email/query`)
 * and a list of Email ids, and returns search snippets for those Emails.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-5.1 | RFC 8621 Section 5.1: SearchSnippet/get}
 */
export type SearchSnippetGetRequestInvocationArgs = {
    /**
     * The id of the account to use.
     */
    accountId: Id;

    /**
     * The same filter as passed to `Email/query`.
     *
     * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.4 | RFC 8621 Section 4.4: Email/query}
     */
    filter?: FilterOperator<EmailFilterCondition> | FilterCondition<EmailFilterCondition> | null;

    /**
     * The ids of the Emails to fetch snippets for.
     */
    emailIds: Id[];
};

/**
 * The response to a `SearchSnippet/get` call.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-5.1 | RFC 8621 Section 5.1: SearchSnippet/get}
 */
export type SearchSnippetGetResponseInvocationArgs = {
    /**
     * The id of the account used for the call.
     */
    accountId: Id;

    /**
     * An array of SearchSnippet objects for the requested Email ids. This may not be in the
     * same order as the ids that were in the request.
     */
    list: SearchSnippetObject[];

    /**
     * An array of Email ids requested that could not be found, or `null` if all ids were found.
     */
    notFound: Id[] | null;
};

/**
 * Union type of all SearchSnippet capability request invocation arguments.
 */
export type SearchSnippetRequestInvocationArgs = SearchSnippetGetRequestInvocationArgs;

/**
 * Union type of all SearchSnippet capability response invocation arguments.
 */
export type SearchSnippetResponseInvocationArgs = SearchSnippetGetResponseInvocationArgs;
