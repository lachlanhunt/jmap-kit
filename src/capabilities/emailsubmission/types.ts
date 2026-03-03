import type { Id, UTCDate } from "../../common/types.js";
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
    PatchObject,
} from "../../invocation/types.js";

/**
 * An Address object used in the Envelope for SMTP submission.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7 | RFC 8621 Section 7: Email Submission}
 */
export type EmailSubmissionAddress = {
    /**
     * The email address being represented by the object. This is a `Mailbox` as used in the
     * Reverse-path or Forward-path of the MAIL FROM or RCPT TO command in
     * {@link https://www.rfc-editor.org/rfc/rfc5321.html RFC 5321}.
     */
    email: string;

    /**
     * Any parameters to send with the email address (either mail-parameter or rcpt-parameter
     * as appropriate, as specified in {@link https://www.rfc-editor.org/rfc/rfc5321.html RFC 5321}).
     * If supplied, each key in the object is a parameter name, and the value is either the
     * parameter value (type `String`) or `null` if the parameter does not take a value.
     */
    parameters?: Record<string, string | null> | null;
};

/**
 * An Envelope object containing the information for use when sending via SMTP.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7 | RFC 8621 Section 7: Email Submission}
 */
export type EmailSubmissionEnvelope = {
    /**
     * The email address to use as the return address in the SMTP submission, plus any
     * parameters to pass with the MAIL FROM address. The JMAP server MAY allow the
     * address to be the empty string.
     */
    mailFrom: EmailSubmissionAddress;

    /**
     * The email addresses to send the message to, and any RCPT TO parameters to pass
     * with the recipient.
     */
    rcptTo: EmailSubmissionAddress[];
};

/**
 * A DeliveryStatus object representing the delivery status for a recipient.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7 | RFC 8621 Section 7: Email Submission}
 */
export type DeliveryStatus = {
    /**
     * The SMTP reply string returned for this recipient when the server last tried to relay
     * the message, or in a later Delivery Status Notification (DSN, as defined in
     * {@link https://www.rfc-editor.org/rfc/rfc3464.html RFC 3464}) response for the message.
     */
    smtpReply: string;

    /**
     * Represents whether the message has been successfully delivered to the recipient.
     * This MUST be one of the following values:
     * - `queued`: The message is in a local mail queue and the status will change once
     *   it exits the local mail queues.
     * - `yes`: The message was successfully delivered to the mail store of the recipient.
     * - `no`: Delivery to the recipient permanently failed.
     * - `unknown`: The final delivery status is unknown.
     */
    delivered: "queued" | "yes" | "no" | "unknown";

    /**
     * Represents whether the message has been displayed to the recipient.
     * This MUST be one of the following values:
     * - `unknown`: The display status is unknown. This is the initial value.
     * - `yes`: The recipient's system claims the message content has been displayed
     *   to the recipient.
     */
    displayed: "unknown" | "yes";
};

/**
 * EmailSubmissionObject properties set by the server. These cannot be set by an
 * `EmailSubmission/set` call.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7 | RFC 8621 Section 7: Email Submission}
 */
export type EmailSubmissionObjectServerSet = Readonly<{
    /**
     * (immutable; server-set) The id of the EmailSubmission.
     */
    id: Id;

    /**
     * (immutable; server-set) The Thread id of the Email to send. This is set by the server
     * to the `threadId` property of the Email referenced by the `emailId`.
     */
    threadId: Id;

    /**
     * (immutable; server-set) The date the submission was/will be released for delivery.
     * If the client successfully used FUTURERELEASE
     * ({@link https://www.rfc-editor.org/rfc/rfc4865.html RFC 4865}) with the submission,
     * this MUST be the time when the server will release the message; otherwise, it MUST be
     * the time the EmailSubmission was created.
     */
    sendAt: UTCDate;

    /**
     * (server-set) This represents the delivery status for each of the submission's recipients,
     * if known. This property MAY not be supported by all servers, in which case it will remain
     * `null`. Servers that support it SHOULD update the EmailSubmission object each time the
     * status of any of the recipients changes, even if some recipients are still being retried.
     *
     * This value is a map from the email address of each recipient to a DeliveryStatus object.
     */
    deliveryStatus: Record<string, DeliveryStatus> | null;

    /**
     * (server-set) A list of blob ids for DSNs
     * ({@link https://www.rfc-editor.org/rfc/rfc3464.html RFC 3464}) received for this
     * submission, in order of receipt, oldest first.
     */
    dsnBlobIds: Id[];

    /**
     * (server-set) A list of blob ids for MDNs
     * ({@link https://www.rfc-editor.org/rfc/rfc8098.html RFC 8098}) received for this
     * submission, in order of receipt, oldest first.
     */
    mdnBlobIds: Id[];
}>;

/**
 * EmailSubmissionObject properties that may be set via an `EmailSubmission/set` call.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7 | RFC 8621 Section 7: Email Submission}
 */
export type EmailSubmissionObjectSettable = {
    /**
     * (immutable) The id of the Identity to associate with this submission.
     */
    readonly identityId: Id;

    /**
     * (immutable) The id of the Email to send. The Email being sent does not have to be a
     * draft, for example, when "redirecting" an existing Email to a different address.
     */
    readonly emailId: Id;

    /**
     * (immutable) Information for use when sending via SMTP. If `null` or omitted on creation,
     * the server MUST generate this from the referenced Email.
     */
    readonly envelope?: EmailSubmissionEnvelope | null;

    /**
     * This represents whether the submission may be canceled. This is server set on create
     * and MUST be one of the following values:
     * - `pending`: It may be possible to cancel this submission.
     * - `final`: The message has been relayed to at least one recipient in a manner that
     *   cannot be recalled. It is no longer possible to cancel this submission.
     * - `canceled`: The submission was canceled and will not be delivered to any recipient.
     */
    undoStatus?: "pending" | "final" | "canceled";
};

/**
 * Properties of the EmailSubmission object.
 *
 * An EmailSubmission object represents the submission of an Email for delivery to one or
 * more recipients.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7 | RFC 8621 Section 7: Email Submission}
 */
export type EmailSubmissionObject = EmailSubmissionObjectServerSet & EmailSubmissionObjectSettable;

/**
 * The arguments for fetching EmailSubmission objects via an `EmailSubmission/get` call.
 */
export type EmailSubmissionGetRequestInvocationArgs = BaseGetRequestInvocationArgs<EmailSubmissionObject>;

/**
 * The response to an `EmailSubmission/get` call.
 */
export type EmailSubmissionGetResponseInvocationArgs = BaseGetResponseInvocationArgs<EmailSubmissionObject>;

/**
 * The arguments for fetching EmailSubmission changes via an `EmailSubmission/changes` call.
 */
export type EmailSubmissionChangesRequestInvocationArgs = BaseChangesRequestInvocationArgs;

/**
 * The response to an `EmailSubmission/changes` call.
 */
export type EmailSubmissionChangesResponseInvocationArgs = BaseChangesResponseInvocationArgs;

/**
 * Filter conditions for `EmailSubmission/query`.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7.3 | RFC 8621 Section 7.3: EmailSubmission/query}
 */
export type EmailSubmissionFilterCondition = Partial<{
    /**
     * The EmailSubmission `identityId` property must be in this list to match the condition.
     */
    identityIds: Id[];

    /**
     * The EmailSubmission `emailId` property must be in this list to match the condition.
     */
    emailIds: Id[];

    /**
     * The EmailSubmission `threadId` property must be in this list to match the condition.
     */
    threadIds: Id[];

    /**
     * The EmailSubmission `undoStatus` property must be identical to the value given to
     * match the condition.
     */
    undoStatus: string;

    /**
     * The `sendAt` property of the EmailSubmission object must be before this date-time
     * to match the condition.
     */
    before: UTCDate;

    /**
     * The `sendAt` property of the EmailSubmission object must be the same as or after
     * this date-time to match the condition.
     */
    after: UTCDate;
}>;

/**
 * The arguments to query EmailSubmission objects via an `EmailSubmission/query` call.
 */
export type EmailSubmissionQueryRequestInvocationArgs = BaseQueryRequestInvocationArgs<
    EmailSubmissionObject,
    EmailSubmissionFilterCondition
>;

/**
 * The response to an `EmailSubmission/query` call.
 */
export type EmailSubmissionQueryResponseInvocationArgs = BaseQueryResponseInvocationArgs;

/**
 * The arguments to query changes to EmailSubmission objects via an
 * `EmailSubmission/queryChanges` call.
 */
export type EmailSubmissionQueryChangesRequestInvocationArgs = BaseQueryChangesRequestInvocationArgs<
    EmailSubmissionObject,
    EmailSubmissionFilterCondition
>;

/**
 * The response to an `EmailSubmission/queryChanges` call.
 */
export type EmailSubmissionQueryChangesResponseInvocationArgs = BaseQueryChangesResponseInvocationArgs;

/**
 * The arguments for creating, updating, and destroying EmailSubmission objects via an
 * `EmailSubmission/set` call.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-7.5 | RFC 8621 Section 7.5: EmailSubmission/set}
 */
export type EmailSubmissionSetRequestInvocationArgs = BaseSetRequestInvocationArgs<EmailSubmissionObjectSettable> & {
    /**
     * A map of EmailSubmission id to an object containing properties to update on the Email
     * object referenced by the EmailSubmission if the create/update/destroy succeeds. For
     * references to EmailSubmissions created in the same `/set` invocation, the id will be
     * the creation id prefixed with a `#`.
     */
    onSuccessUpdateEmail?: Record<Id, PatchObject> | null;

    /**
     * A list of EmailSubmission ids for which the Email with the corresponding `emailId`
     * should be destroyed if the create/update/destroy succeeds. For references to
     * EmailSubmission creations, the id will be the creation id prefixed with a `#`.
     */
    onSuccessDestroyEmail?: Id[] | null;
};

/**
 * The response to an `EmailSubmission/set` call.
 */
export type EmailSubmissionSetResponseInvocationArgs = BaseSetResponseInvocationArgs<EmailSubmissionObject>;

/**
 * Union type of all EmailSubmission capability request invocation arguments.
 */
export type EmailSubmissionRequestInvocationArgs =
    | EmailSubmissionGetRequestInvocationArgs
    | EmailSubmissionChangesRequestInvocationArgs
    | EmailSubmissionQueryRequestInvocationArgs
    | EmailSubmissionQueryChangesRequestInvocationArgs
    | EmailSubmissionSetRequestInvocationArgs;

/**
 * Union type of all EmailSubmission capability response invocation arguments.
 */
export type EmailSubmissionResponseInvocationArgs =
    | EmailSubmissionGetResponseInvocationArgs
    | EmailSubmissionChangesResponseInvocationArgs
    | EmailSubmissionQueryResponseInvocationArgs
    | EmailSubmissionQueryChangesResponseInvocationArgs
    | EmailSubmissionSetResponseInvocationArgs;
