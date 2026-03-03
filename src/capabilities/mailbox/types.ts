import type { Id, UnsignedInt } from "../../common/types.js";
import type {
    BaseChangesRequestInvocationArgs,
    BaseChangesResponseInvocationArgs,
    BaseGetRequestInvocationArgs,
    BaseGetResponseInvocationArgs,
    BaseQueryChangesRequestInvocationArgs,
    BaseQueryChangesResponseInvocationArgs,
    BaseQueryRequestInvocationArgs,
    BaseQueryResponseInvocationArgs,
    BaseSetRequestInvocationArgs,
    BaseSetResponseInvocationArgs,
} from "../../invocation/types.js";

/**
 * The set of rights (Access Control Lists (ACLs)) the user has
 * in relation to this Mailbox. These are backwards compatible with IMAP ACLs,
 * as defined in {@link https://www.rfc-editor.org/rfc/rfc4314.html RFC 4314}.
 */
export type MailboxRights = {
    /**
     *
     * If true, the user may use this Mailbox as part of a filter in an `Email/query`
     * call, and the Mailbox may be included in the mailboxIds property of Email objects.
     * Email objects may be fetched if they are in at least one Mailbox with this permission.
     * If a sub-Mailbox is shared but not the parent Mailbox, this may be `false`.
     * Corresponds to IMAP ACLs `lr` (if mapping from IMAP, both are required for this to be `true`).
     */
    mayReadItems: boolean;

    /**
     * The user may add mail to this Mailbox (by either creating a new Email
     * or moving an existing one). Corresponds to IMAP ACL `i`.
     */
    mayAddItems: boolean;

    /**
     * The user may remove mail from this Mailbox (by either changing the
     * Mailboxes of an Email or destroying the Email). Corresponds to
     * IMAP ACLs `te` (if mapping from IMAP, both are required for this to be true).
     */
    mayRemoveItems: boolean;

    /**
     * The user may add or remove the `$seen` keyword to/from an Email.
     * If an Email belongs to multiple Mailboxes, the user may only modify
     * `$seen` if they have this permission for all of the Mailboxes.
     * Corresponds to IMAP ACL `s`.
     */
    maySetSeen: boolean;

    /**
     * The user may add or remove any keyword other than `$seen` to/from an
     * Email. If an Email belongs to multiple Mailboxes, the user may only
     * modify keywords if they have this permission for all of the Mailboxes.
     * Corresponds to IMAP ACL `w`.
     */
    maySetKeywords: boolean;

    /**
     * The user may create a Mailbox with this Mailbox as its parent.
     * Corresponds to IMAP ACL k.
     */
    mayCreateChild: boolean;

    /**
     * The user may rename the Mailbox or make it a child of another Mailbox.
     * Corresponds to IMAP ACL `x` (although this covers both rename and
     * delete permissions).
     */
    mayRename: boolean;

    /**
     * The user may delete the Mailbox itself. Corresponds to IMAP ACL `x`
     * (although this covers both rename and delete permissions).
     */
    mayDelete: boolean;

    /**
     * Messages may be submitted directly to this Mailbox. Corresponds to
     * IMAP ACL `p`.
     */
    maySubmit: boolean;
};

/**
 * MailboxObject properties set by the server. These cannot be set by a `Mailbox/set` call
 */
export type MailboxObjectServerSet = Readonly<{
    /**
     * (immutable) The id of the Mailbox.
     */
    id: Id;

    /**
     * The number of Emails in this Mailbox.
     */
    totalEmails: UnsignedInt;

    /**
     * The number of Emails in this Mailbox that have neither the
     * `$seen` keyword nor the `$draft` keyword.
     */
    unreadEmails: UnsignedInt;

    /**
     * The number of Threads where at least one Email in the Thread
     * is in this Mailbox.
     */
    totalThreads: UnsignedInt;

    /**
     * An indication of the number of “unread” Threads in the Mailbox.
     */
    unreadThreads: UnsignedInt;

    /**
     * The set of rights (Access Control Lists (ACLs)) the user has
     * in relation to this Mailbox. These are backwards compatible with IMAP ACLs,
     * as defined in {@link https://www.rfc-editor.org/rfc/rfc4314.html RFC 4314}.
     */
    myRights: MailboxRights;
}>;

/**
 * MailboxObject properties that may be set via a `Mailbox/set` call
 */
export type MailboxObjectSettable = {
    /**
     * User-visible name for the Mailbox, e.g., “Inbox”. This MUST be a Net-Unicode string
     * {@link https://www.rfc-editor.org/rfc/rfc5198.html RFC 5198} of at least 1 character in length,
     * subject to the maximum size given in the capability object.
     */
    name: string;

    /**
     * (default: null) The Mailbox id for the parent of this Mailbox,
     * or null if this Mailbox is at the top level.
     */
    parentId?: Id | null;

    /**
     * (default: null) Identifies Mailboxes that have a particular common purpose (e.g., the “inbox”),
     * regardless of the name property (which may be localised).
     */
    role?: string | null;

    /**
     * (default: 0) Defines the sort order of Mailboxes when presented in the client’s UI,
     * so it is consistent between devices. The number MUST be an integer in the range
     * `0 <= sortOrder < 2^31`.
     */
    sortOrder?: UnsignedInt;

    /**
     * Has the user indicated they wish to see this Mailbox in their client?
     * This SHOULD default to false for Mailboxes in shared accounts
     * the user has access to and true for any new Mailboxes created by the
     * user themself. This MUST be stored separately per user where multiple
     * users have access to a shared Mailbox.
     */
    isSubscribed?: boolean;
};

/**
 * Properties of the Mailbox object.
 */
export type MailboxObject = MailboxObjectServerSet & MailboxObjectSettable;

/**
 * The arguments for fetching Mailbox objects via a `Mailbox/get` call
 */
export type MailboxGetRequestInvocationArgs = BaseGetRequestInvocationArgs<MailboxObject>;

/**
 * The response to a `Mailbox/get` call
 */
export type MailboxGetResponseInvocationArgs = BaseGetResponseInvocationArgs<MailboxObject>;

/**
 * The arguments for fetching Mailbox changes via a `Mailbox/changes` call
 */
export type MailboxChangesRequestInvocationArgs = BaseChangesRequestInvocationArgs;

/**
 * The response to a `Mailbox/changes` call
 */
export type MailboxChangesResponseInvocationArgs = BaseChangesResponseInvocationArgs & {
    /**
     * If only the “totalEmails”, “unreadEmails”, “totalThreads”, and/or “unreadThreads” Mailbox
     * properties have changed since the old state, this will be the list of properties that may
     * have changed. If the server is unable to tell if only counts have changed, it MUST just be
     * null.
     */
    updatedProperties?: string[] | null;
};

export type MailboxFilterCondition = Partial<{
    /**
     *
     * The Mailbox parentId property must match the given value exactly.
     */
    parentId: Id | null;

    /**
     * The Mailbox name property contains the given string.
     */
    name: string;

    /**
     * The Mailbox role property must match the given value exactly.
     */
    role: string | null;

    /**
     *  If true, a Mailbox matches if it has any non-null value for its role property.
     */
    hasAnyRole: boolean;

    /**
     * The isSubscribed property of the Mailbox must be identical to the value given to match the condition.
     */
    isSubscribed: boolean;
}>;

/**
 * The arguments to query Mailbox objects via a `Mailbox/query` call
 */
export type MailboxQueryRequestInvocationArgs = BaseQueryRequestInvocationArgs<
    MailboxObject,
    MailboxFilterCondition
> & {
    /**
     * (default: false) If true, when sorting the query results and comparing
     * Mailboxes A and B:
     * - If A is an ancestor of B, it always comes first regardless of the sort
     *   comparators. Similarly, if A is descendant of B, then B always comes first.
     * - Otherwise, if A and B do not share a parentId, find the nearest ancestors
     *   of each that do have the same parentId and compare the sort properties on
     *   those Mailboxes instead.
     *
     * The result of this is that the Mailboxes are sorted as a tree according to
     * the parentId properties, with each set of children with a common parent
     * sorted according to the standard sort comparators.
     */
    sortAsTree?: boolean;

    /**
     * (default: false) If true, a Mailbox is only included in the query if all
     * its ancestors are also included in the query according to the filter.
     */
    filterAsTree?: boolean;
};

/**
 * The response to a `Mailbox/query` call
 */
export type MailboxQueryResponseInvocationArgs = BaseQueryResponseInvocationArgs;

/**
 * The arguments to query changes to Mailbox objects via a `Mailbox/queryChanges` call
 */
export type MailboxQueryChangesRequestInvocationArgs = BaseQueryChangesRequestInvocationArgs<
    MailboxObject,
    MailboxFilterCondition
>;

/**
 * The response to a `Mailbox/queryChanges` call
 */
export type MailboxQueryChangesResponseInvocationArgs = BaseQueryChangesResponseInvocationArgs;

/**
 * The arguments for creating, updating, and destroying Mailbox objects via a `Mailbox/set` call
 */
export type MailboxSetRequestInvocationArgs = BaseSetRequestInvocationArgs<MailboxObjectSettable> & {
    /**
     * (default: false) If false, any attempt to destroy a Mailbox that still has Emails
     * in it will be rejected with a mailboxHasEmail SetError. If true, any Emails that
     * were in the Mailbox will be removed from it, and if in no other Mailboxes, they
     * will be destroyed when the Mailbox is destroyed.
     */
    onDestroyRemoveEmails?: boolean;
};

export type MailboxSetResponseInvocationArgs = BaseSetResponseInvocationArgs<MailboxObject> & {
    /**
     * (default: false) If false, any attempt to destroy a Mailbox that still has Emails in it will
     * be rejected with a mailboxHasEmail SetError. If true, any Emails that were in the Mailbox
     * will be removed from it, and if in no other Mailboxes, they will be destroyed when the
     * Mailbox is destroyed.
     */
    onDestroyRemoveEmails?: boolean;
};

/**
 * Union type of all Mailbox capability request invocation arguments
 */
export type MailboxRequestInvocationArgs =
    | MailboxGetRequestInvocationArgs
    | MailboxChangesRequestInvocationArgs
    | MailboxQueryRequestInvocationArgs
    | MailboxQueryChangesRequestInvocationArgs
    | MailboxSetRequestInvocationArgs;

/**
 * Union type of all Mailbox capability response invocation arguments
 */
export type MailboxResponseInvocationArgs =
    | MailboxGetResponseInvocationArgs
    | MailboxChangesResponseInvocationArgs
    | MailboxQueryResponseInvocationArgs
    | MailboxQueryChangesResponseInvocationArgs
    | MailboxSetResponseInvocationArgs;
