import type { Id, TZDate, UnsignedInt, UTCDate } from "../../common/types.js";
import type {
    BaseChangesRequestInvocationArgs,
    BaseChangesResponseInvocationArgs,
    BaseCopyRequestInvocationArgs,
    BaseCopyResponseInvocationArgs,
    BaseGetRequestInvocationArgs,
    BaseGetResponseInvocationArgs,
    BaseQueryChangesRequestInvocationArgs,
    BaseQueryChangesResponseInvocationArgs,
    BaseQueryRequestInvocationArgs,
    BaseQueryResponseInvocationArgs,
    BaseSetRequestInvocationArgs,
    BaseSetResponseInvocationArgs,
    SetError,
} from "../../invocation/types.js";

/**
 * Keywords defined in the
 * {@link https://www.iana.org/assignments/imap-jmap-keywords/imap-jmap-keywords.xhtml IMAP and JMAP Keywords Registry}
 */
export type JMAPKeywords =
    | "$draft"
    | "$seen"
    | "$flagged"
    | "$answered"
    | "$forwarded"
    | "$phishing"
    | "$junk"
    | "$notjunk"
    | "$mdnsent"
    | "$submitPending"
    | "$submitted"
    | "$important";

/**
 * Header fields parsed as an address-list value, as specified in
 * {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322}, Section 3.4,
 * into the EmailAddress[] type. There is an EmailAddress item for each
 * mailbox parsed from the address-list. Group and comment information
 * is discarded.
 */
export type EmailAddress = {
    /**
     * The display-name of the mailbox {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322}.
     * If this is a quoted-string:
     * - The surrounding DQUOTE characters are removed.
     * - Any quoted-pair is decoded.
     * - White space is unfolded, and then any leading and trailing white space is removed.
     *
     * If there is no display-name but there is a comment immediately following the `addr-spec`,
     * the value of this SHOULD be used instead. Otherwise, this property is null.
     */
    name?: string | null;

    /**
     * The addr-spec of the mailbox {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322}.
     */
    email: string;
};

/**
 * Header fields parsed as an address-list value, as specified in
 * {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322}, Section 3.4,
 * into the EmailAddressGroup[] type. Consecutive mailbox values that
 * are not part of a group are still collected under an EmailAddressGroup
 * object to provide a uniform type.
 */
export type EmailAddressGroup = {
    /**
     * The display-name of the group {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322},
     * or null if the addresses are not part of a group. If this is a quoted-string,
     * it is processed the same as the name in the EmailAddress type.
     */
    name?: string | null;

    /**
     * The mailbox values that belong to this group, represented as EmailAddress objects.
     */
    addresses: EmailAddress[];
};

/**
 * Raw header field value as a string (no parsing applied)
 */
export type EmailHeaderFieldParsedFormRaw = string;

/**
 * Header field value parsed as text (RFC 2047 decoding applied)
 */
export type EmailHeaderFieldParsedFormText = string;

/**
 * Header field value parsed as an address list into EmailAddress objects
 */
export type EmailHeaderFieldParsedFormAddresses = EmailAddress[];

/**
 * Header field value parsed as a grouped address list into EmailAddressGroup objects
 */
export type EmailHeaderFieldParsedFormGroupedAddresses = EmailAddressGroup[];

/**
 * Header field value parsed as message IDs (e.g., In-Reply-To, References)
 */
export type EmailHeaderFieldParsedFormMessageIds = string[] | null;

/**
 * Header field value parsed as a date with timezone information
 */
export type EmailHeaderFieldParsedFormDate = TZDate | null;

/**
 * Header field value parsed as a list of URLs
 */
export type EmailHeaderFieldParsedFormURLs = string[] | null;

/**
 * Union of all possible parsed forms for email header field values
 */
export type EmailHeaderFieldParsedForms =
    | EmailHeaderFieldParsedFormRaw
    | EmailHeaderFieldParsedFormAddresses
    | EmailHeaderFieldParsedFormGroupedAddresses
    | EmailHeaderFieldParsedFormMessageIds
    | EmailHeaderFieldParsedFormDate
    | EmailHeaderFieldParsedFormURLs;

/**
 * An email header field as defined in
 * {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322}
 */
export type EmailHeader = {
    /**
     * The header field name as defined in
     * {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322},
     * with the same capitalization that it has in the message.
     */
    readonly name: string;

    /**
     * The header field value as defined in
     * {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322},
     * in Raw form.
     */
    readonly value: string;
};

/**
 * These properties are derived from the message body
 * {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322}
 * and its MIME entities {@link https://www.rfc-editor.org/rfc/rfc2045.html RFC 2045}.
 */
export type EmailBodyPart = {
    /**
     * Identifies this part uniquely within the Email. This is scoped to the emailId
     * and has no meaning outside of the JMAP Email object representation. This is `null`
     * if, and only if, the part is of type multipart/*.
     */
    partId?: string | null;

    /**
     * The id representing the raw octets of the contents of the part, after decoding
     * any known Content-Transfer-Encoding (as defined in
     * {@link https://www.rfc-editor.org/rfc/rfc2045.html RFC 2045}), or null if, and only if,
     * the part is of type multipart/*.
     * Note that two parts may be transfer-encoded differently but have the same blob id
     * if their decoded octets are identical and the server is using a secure hash of the
     * data for the blob id. If the transfer encoding is unknown, it is treated as though
     * it had no transfer encoding.
     */
    blobId?: Id | null;

    /**
     * The size, in octets, of the raw data after content transfer decoding (as referenced
     * by the blobId, i.e., the number of octets in the file the user would download).
     */
    size: UnsignedInt;

    /**
     * This is a list of all header fields in the part, in the order they appear in
     * the message. The values are in Raw form.
     */
    headers: EmailHeader[];

    /**
     * This is the decoded filename parameter of the Content-Disposition header
     * field per {@link https://www.rfc-editor.org/rfc/rfc2231.html RFC 2231}, or
     * (for compatibility with existing systems) if not present, then it’s the
     * decoded name parameter of the Content-Type header field per
     * {@link https://www.rfc-editor.org/rfc/rfc2047.html RFC 2047}.
     */
    name?: string | null;

    /**
     * The value of the Content-Type header field of the part, if present; otherwise,
     * the implicit type as per the MIME standard (text/plain or message/rfc822 if
     * inside a multipart/digest). CFWS is removed and any parameters are stripped.
     */
    type: string;

    /**
     * The value of the charset parameter of the Content-Type header field,
     * if present, or `null` if the header field is present but not of type
     * `text/*`. If there is no Content-Type header field, or it exists and
     * is of type `text/*` but has no charset parameter, this is the implicit
     * charset as per the MIME standard: `us-ascii`.
     */
    charset?: string | null;

    /**
     * The value of the Content-Disposition header field of the part, if present;
     * otherwise, it’s null. CFWS is removed and any parameters are stripped.
     */
    disposition?: string | null;

    /**
     * The value of the Content-Id header field of the part, if present;
     * otherwise it’s null. CFWS and surrounding angle brackets (<>) are removed.
     * This may be used to reference the content from within a text/html body part
     * HTML using the cid: protocol, as defined in
     * {@link https://www.rfc-editor.org/rfc/rfc2392.html RFC 2392}.
     */
    cid?: string | null;

    /**
     * The list of language tags, as defined in
     * {@link https://www.rfc-editor.org/rfc/rfc3282.html RFC 3282}, in the
     * Content-Language header field of the part, if present.
     */
    language?: string[] | null;

    /**
     * The URI, as defined in {@link https://www.rfc-editor.org/rfc/rfc2557.html RFC 2557},
     * in the Content-Location header field of the part, if present.
     */
    location?: string | null;

    /**
     * If the type is multipart/*, this contains the body parts of each child.
     */
    subParts?: EmailBodyPart[] | null;
};

/**
 * An EmailBodyValue object has the following properties:
 */
export type EmailBodyValue = {
    /**
     * The value of the body part after decoding Content-Transfer-Encoding and
     * the Content-Type charset, if both known to the server, and with any CRLF
     * replaced with a single LF. The server MAY use heuristics to determine
     * the charset to use for decoding if the charset is unknown, no charset is
     * given, or it believes the charset given is incorrect. Decoding is best
     * effort; the server SHOULD insert the unicode replacement character (U+FFFD)
     * and continue when a malformed section is encountered.
     *
     * Note that due to the charset decoding and line ending normalisation,
     * the length of this string will probably not be exactly the same as the size
     * property on the corresponding EmailBodyPart.
     */
    value: string;

    /**
     * (default: false) This is true if malformed sections were found while decoding the charset, or the charset was unknown, or the content-transfer-encoding was unknown.
     */
    isEncodingProblem?: boolean;

    /**
     * (default: false) This is true if the value has been truncated.
     */
    isTruncated?: boolean;
};

/**
 * EmailObject properties that may be set via an `Email/set` call
 */
export type EmailObjectServerSet = Readonly<{
    /**
     * (immutable) The id of the Email object.
     *
     * Note that this is the JMAP object id, NOT the Message-ID header field value
     * of the message {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322}.
     */
    id: Id;

    /**
     * (immutable) The id representing the raw octets of the message
     * {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322} for this Email.
     * This may be used to download the raw original message or to attach it
     * directly to another Email, etc.
     */
    blobId: Id;

    /**
     * (immutable) The id of the Thread to which this Email belongs.
     */
    threadId: Id;

    /**
     * (immutable) The size, in octets, of the raw data for the message
     * {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322} (as referenced
     * by the blobId, i.e., the number of octets in the file the user would
     * download).
     */
    size: UnsignedInt;

    /**
     * (immutable) This is a list of all header fields
     * {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322}, in the same order
     * they appear in the message.
     */
    headers: EmailHeader[];

    /**
     * (immutable) This is true if there are one or more parts in the message
     * that a client UI should offer as downloadable. A server SHOULD set
     * hasAttachment to true if the attachments list contains at least one item
     * that does not have Content-Disposition: inline. The server MAY ignore
     * parts in this list that are processed automatically in some way or are
     * referenced as embedded images in one of the text/html parts of the message.
     */
    hasAttachment: boolean;

    /**
     * (immutable) A plaintext fragment of the message body. This is intended
     * to be shown as a preview line when listing messages in the mail store
     * and may be truncated when shown. The server may choose which part of
     * the message to include in the preview; skipping quoted sections and
     * salutations and collapsing white space can result in a more useful
     * preview.
     *
     * This MUST NOT be more than 256 characters in length.
     *
     * As this is derived from the message content by the server, and the
     * algorithm for doing so could change over time, fetching this for an
     * Email a second time MAY return a different result. However, the
     * previous value is not considered incorrect, and the change SHOULD NOT
     * cause the Email object to be considered as changed by the server.
     */
    preview: string;
}>;

/**
 * EmailObject properties that may be set via an `Email/set` call
 */
export type EmailObjectSettable = {
    /**
     * The set of Mailbox ids this Email belongs to. An Email in the mail store
     * MUST belong to one or more Mailboxes at all times (until it is destroyed).
     * The set is represented as an object, with each key being a Mailbox id. The
     * value for each key in the object MUST be true.
     */
    mailboxIds: Record<Id, true>;

    /**
     * (default: `{}`) A set of keywords that apply to the Email. The set is represented
     * as an object, with the keys being the keywords. The value for each key in the
     * object MUST be true.
     *
     * Keywords are shared with IMAP. The six system keywords from IMAP get special
     * treatment. The following four keywords have their first character changed from
     * `\` in IMAP to `$` in JMAP and have particular semantic meaning:
     * - `$draft`: The Email is a draft the user is composing.
     * - `$seen`: The Email has been read.
     * - `$flagged`: The Email has been flagged for urgent/special attention.
     * - `$answered`: The Email has been replied to.
     *
     * The IMAP `\Recent` keyword is not exposed via JMAP. The IMAP `\Deleted`
     * keyword is also not present: IMAP uses a delete+expunge model, which
     * JMAP does not.
     *
     * Users may add arbitrary keywords to an Email. For compatibility with IMAP,
     * a keyword is a case-insensitive string of 1–255 characters in the ASCII
     * subset `%x21–%x7e` (excludes control chars and space), and it MUST NOT
     * include any of these characters:
     *
     * `( ) { ] % * " \`
     *
     * Because JSON is case sensitive, servers MUST return keywords in lowercase.
     *
     * The IMAP and JMAP Keywords registry as established in
     * {@link https://www.rfc-editor.org/rfc/rfc5788.html RFC 5788} assigns semantic meaning
     * to some other keywords in common use.
     *
     * New keywords may be established here in the future. In particular, note:
     * - `$forwarded`: The Email has been forwarded.
     * - `$phishing`: The Email is highly likely to be phishing. Clients SHOULD
     *   warn users to take care when viewing this Email and disable links and
     *   attachments.
     * - `$junk`: The Email is definitely spam. Clients SHOULD set this flag when
     *   users report spam to help train automated spam-detection systems.
     * - `$notjunk`: The Email is definitely not spam. Clients SHOULD set this
     *   flag when users indicate an Email is legitimate, to help train
     *   automated spam-detection systems.
     */
    keywords?: Record<JMAPKeywords, true> | Record<string, true>;

    /**
     * (immutable; default: time of creation on server) The date the Email
     * was received by the message store. This is the internal date in IMAP
     * {@link https://www.rfc-editor.org/rfc/rfc3501.html RFC 3501}.
     */
    readonly receivedAt?: UTCDate;

    /**
     * (immutable) The value is identical to the value of header:Message-ID:asMessageIds.
     * For messages conforming to {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322}
     * this will be an array with a single entry.
     */
    readonly messageId?: string[] | null;

    /**
     * (immutable) The value is identical to the value of header:In-Reply-To:asMessageIds.
     */
    readonly inReplyTo?: string[] | null;

    /**
     * (immutable) The value is identical to the value of header:References:asMessageIds.
     */
    readonly references?: string[] | null;

    /**
     * (immutable) The value is identical to the value of header:Sender:asAddresses.
     */
    readonly sender?: EmailAddress[] | null;

    /**
     * (immutable) The value is identical to the value of header:From:asAddresses.
     */
    readonly from?: EmailAddress[] | null;

    /**
     * (immutable) The value is identical to the value of header:To:asAddresses.
     */
    readonly to?: EmailAddress[] | null;

    /**
     * (immutable) The value is identical to the value of header:Cc:asAddresses.
     */
    readonly cc?: EmailAddress[] | null;

    /**
     * (immutable) The value is identical to the value of header:Bcc:asAddresses.
     */
    readonly bcc?: EmailAddress[] | null;

    /**
     * (immutable) The value is identical to the value of header:Reply-To:asAddresses.
     */
    readonly replyTo?: EmailAddress[] | null;

    /**
     * (immutable) The value is identical to the value of header:Subject:asText.
     */
    readonly subject?: string | null;

    /**
     * (immutable; default on creation: current server time)
     * The value is identical to the value of header:Date:asDate.
     */
    readonly sentAt?: TZDate | null;

    /**
     * (immutable) This is the full MIME structure of the message body,
     * without recursing into message/rfc822 or message/global parts.
     * Note that EmailBodyParts may have subParts if they are of type
     * multipart/*.
     */
    bodyStructure: EmailBodyPart;

    /**
     * (immutable) This is a map of partId to an EmailBodyValue object for none,
     * some, or all text/* parts. Which parts are included and whether the value
     * is truncated is determined by various arguments to Email/get and Email/parse.
     */
    bodyValues: Record<string, EmailBodyValue>;

    /**
     * (immutable) A list of text/plain, text/html, image/*, audio/*, and/or video/*
     * parts to display (sequentially) as the message body, with a preference for
     * text/plain when alternative versions are available.
     */
    textBody: EmailBodyPart[];

    /**
     * (immutable) A list of text/plain, text/html, image/*, audio/*, and/or video/*
     * parts to display (sequentially) as the message body, with a preference for
     * text/html when alternative versions are available.
     */
    htmlBody: EmailBodyPart[];

    /**
     * (immutable) A list, traversing depth-first, of all parts in bodyStructure
     * that satisfy either of the following conditions:
     * - not of type multipart/* and not included in textBody or htmlBody
     * - of type image/*, audio/*, or video/* and not in both textBody and htmlBody
     *
     * None of these parts include subParts, including message/* types. Attached
     * messages may be fetched using the Email/parse method and the blobId.
     *
     * Note that a text/html body part HTML may reference image parts in
     * attachments by using cid: links to reference the Content-Id, as defined in
     * {@link https://www.rfc-editor.org/rfc/rfc2392.html RFC 2392}, or by referencing
     * the Content-Location.
     */
    attachments: Omit<EmailBodyPart, "subParts">[];
};

export type EmailObjectHeaderField = {
    /**
     * The client may request/send properties representing individual header fields of the form:
     *
     *   `header:{header-field-name}`
     *
     * Where {header-field-name} means any series of one or more printable ASCII characters
     * (i.e., characters that have values between 33 and 126, inclusive), except for colon (:).
     * The property may also have the following suffixes:
     *
     * - :as{header-form} This means the value is in a parsed form, where
     *   {header-form} is one of the parsed-form names:
     *   `Raw`, `Text`, `Addresses`, `GroupedAddresses`, `MessageIds`, `Date`, `URLs`.
     * . If not given, the value is in Raw form.
     *
     * - :all This means the value is an array, with the items corresponding to each
     *   instance of the header field, in the order they appear in the message.
     *   If this suffix is not used, the result is the value of the last instance of
     *   the header field (i.e., identical to the last item in the array if :all is used),
     *   or null if none.
     *
     * If both suffixes are used, they MUST be specified in the order above.
     * Header field names are matched case insensitively. The value is typed
     * according to the requested form or to an array of that type if :all is used.
     * If no header fields exist in the message with the requested name, the value
     * is null if fetching a single instance or an empty array if requesting :all.
     */
    [header: `header:${string}`]: EmailHeaderFieldParsedForms | EmailHeaderFieldParsedForms[];
};

export type EmailObject = EmailObjectSettable & EmailObjectServerSet & EmailObjectHeaderField;

/**
 * The EmailImport object referencing the blobs to be imported
 */
export type EmailImport = {
    /**
     * The id of the blob containing the raw message
     * {@link https://www.rfc-editor.org/rfc/rfc5322.html RFC 5322}.
     */
    blobId: Id;

    /**
     * The ids of the Mailboxes to assign this Email to.
     * At least one Mailbox MUST be given.
     */
    mailboxIds: Record<Id, true>;

    /**
     * (default: {}) The keywords to apply to the Email.
     */
    keywords?: Record<string, true>;

    /**
     * (default: time of most recent Received header, or time of import on server
     * if none) The receivedAt date to set on the Email.
     */
    receivedAt?: UTCDate;
};

/**
 * The arguments for fetching Email objects via an `Email/get` call
 */
export type EmailGetRequestInvocationArgs = BaseGetRequestInvocationArgs<EmailObject> & {
    /**
     *  A list of properties to fetch for each EmailBodyPart returned. If omitted, this defaults to:
     *
     *   [ "partId", "blobId", "size", "name", "type", "charset",
     *     "disposition", "cid", "language", "location" ]
     */
    bodyProperties?: string[];

    /**
     * (default: false) If true, the bodyValues property includes any text/* part
     * in the textBody property.
     */
    fetchTextBodyValues?: boolean;

    /**
     * (default: false) If true, the bodyValues property includes any text/* part
     * in the htmlBody property.
     */
    fetchHTMLBodyValues?: boolean;

    /**
     * (default: false) If true, the bodyValues property includes any text/* part
     * in the bodyStructure property.
     */
    fetchAllBodyValues?: boolean;

    /**
     * (default: 0) If greater than zero, the value property of any EmailBodyValue
     * object returned in bodyValues MUST be truncated if necessary so it does not
     * exceed this number of octets in size. If 0 (the default), no truncation occurs.
     */
    maxBodyValueBytes?: UnsignedInt;
};

export type EmailGetResponseInvocationArgs = BaseGetResponseInvocationArgs<EmailObject>;

/**
 * The arguments for fetching Email changes via an `Email/changes` call
 */
export type EmailChangesRequestInvocationArgs = BaseChangesRequestInvocationArgs;

/**
 * The response to an `Email/changes` call
 */
export type EmailChangesResponseInvocationArgs = BaseChangesResponseInvocationArgs;

export type EmailFilterCondition = Partial<{
    /**
     * A Mailbox id. An Email must be in this Mailbox to match the condition.
     */
    inMailbox: Id;

    /**
     * A list of Mailbox ids. An Email must be in at least one Mailbox not in
     * this list to match the condition. This is to allow messages solely in
     * trash/spam to be easily excluded from a search.
     */
    inMailboxOtherThan: Id[];

    /**
     * The receivedAt date-time of the Email must be before this date-time to
     * match the condition.
     */
    before: UTCDate;

    /**
     * The receivedAt date-time of the Email must be the same or after this
     * date-time to match the condition.
     */
    after: UTCDate;

    /**
     * The size property of the Email must be equal to or greater than this
     * number to match the condition.
     */
    minSize: UnsignedInt;

    /**
     * The size property of the Email must be less than this number to match
     * the condition.
     */
    maxSize: UnsignedInt;

    /**
     * All Emails (including this one) in the same Thread as this Email must have
     * the given keyword to match the condition.
     */
    allInThreadHaveKeyword: string;

    /**
     * At least one Email (possibly this one) in the same Thread as this Email
     * must have the given keyword to match the condition.
     */
    someInThreadHaveKeyword: string;

    /**
     * All Emails (including this one) in the same Thread as this Email must not
     * have the given keyword to match the condition.
     */
    noneInThreadHaveKeyword: string;

    /**
     * This Email must have the given keyword to match the condition.
     */
    hasKeyword: string;

    /**
     * This Email must not have the given keyword to match the condition.
     */
    notKeyword: string;

    /**
     * The hasAttachment property of the Email must be identical to the value
     * given to match the condition.
     */
    hasAttachment: boolean;

    /**
     * Looks for the text in Emails. The server MUST look up text in the From,
     * To, Cc, Bcc, and Subject header fields of the message and SHOULD look
     * inside any `text/*` or other body parts that may be converted to text by
     * the server. The server MAY extend the search to any additional textual
     * property.
     */
    text: string;

    /**
     * Looks for the text in the From header field of the message.
     */
    from: string;

    /**
     * Looks for the text in the To header field of the message.
     */
    to: string;

    /**
     * Looks for the text in the Cc header field of the message.
     */
    cc: string;

    /**
     * Looks for the text in the Bcc header field of the message.
     */
    bcc: string;

    /**
     * Looks for the text in the Subject header field of the message.
     */
    subject: string;

    /**
     * Looks for the text in one of the body parts of the message. The server
     * MAY exclude MIME body parts with content media types other than `text/*`
     * and `message/*` from consideration in search matching. Care should be
     * taken to match based on the text content actually presented to an end
     * user by viewers for that media type or otherwise identified as appropriate
     * for search indexing. Matching document metadata uninteresting to an end
     * user (e.g., markup tag and attribute names) is undesirable.
     */
    body: string;

    /**
     * The array MUST contain either one or two elements. The first element is
     * the name of the header field to match against. The second (optional)
     * element is the text to look for in the header field value. If not supplied,
     * the message matches simply if it has a header field of the given name.
     */
    header: string[];

    /**
     */
}>;

/**
 * The arguments to query Email objects via an `Email/query` call
 */
export type EmailQueryRequestInvocationArgs = BaseQueryRequestInvocationArgs<EmailObject, EmailFilterCondition> & {
    /**
     * (default: false) If true, Emails in the same Thread as a previous Email in
     * the list (given the filter and sort order) will be removed from the list.
     * This means only one Email at most will be included in the list for any
     * given Thread.
     */
    collapseThreads?: boolean;
};

/**
 * The response to an `Email/query` call
 */
export type EmailQueryResponseInvocationArgs = BaseQueryResponseInvocationArgs;

/**
 * The arguments to query changes to Email objects via an `Email/queryChanges` call
 */
export type EmailQueryChangesRequestInvocationArgs = BaseQueryChangesRequestInvocationArgs<
    EmailObject,
    EmailFilterCondition
> & {
    /**
     * (default: false) If true, Emails in the same Thread as a previous Email in
     * the list (given the filter and sort order) will be removed from the list.
     * This means only one Email at most will be included in the list for any
     * given Thread.
     */
    collapseThreads?: boolean;
};

/**
 * The response to an `Email/queryChanges` call
 */
export type EmailQueryChangesResponseInvocationArgs = BaseQueryChangesResponseInvocationArgs;

/**
 * The arguments to copy or move objects between two different Email accounts via an `Email/copy` call
 */
export type EmailCopyRequestInvocationArgs = BaseCopyRequestInvocationArgs<
    Pick<EmailObject, "id" | "mailboxIds" | "keywords" | "receivedAt">
>;

export type EmailCopyResponseInvocationArgs = BaseCopyResponseInvocationArgs<
    Pick<EmailObject, "id" | "blobId" | "threadId" | "size">
>;

/**
 * The arguments for creating, updating, and destroying Email objects via an `Email/set` call
 */
export type EmailSetRequestInvocationArgs = BaseSetRequestInvocationArgs<EmailObjectSettable>;

/**
 * The response to an `Email/set` call
 */
export type EmailSetResponseInvocationArgs = BaseSetResponseInvocationArgs<
    Pick<EmailObject, "id" | "blobId" | "threadId" | "size">
>;

/**
 * The arguments for importing Email objects via an `Email/import` call
 */
export type EmailImportRequestInvocationArgs = {
    /**
     *  The id of the account to use.
     */
    accountId: Id;

    /**
     * This is a state string as returned by the Email/get method. If supplied,
     * the string must match the current state of the account referenced by the
     * accountId; otherwise, the method will be aborted and a stateMismatch error
     * returned. If null, any changes will be applied to the current state.
     */
    ifInState?: string | null;

    /**
     *  A map of creation id (client specified) to EmailImport objects.
     */
    emails: Record<Id, EmailImport>;
};

export type EmailImportResponseInvocationArgs = {
    /** The id of the account used for this call. */
    accountId: Id;

    /**
     * The state string that would have been returned by Email/get on this account before making the
     * requested changes, or `null` if the server doesn’t know what the previous state string was.
     */
    oldState: string | null;

    /** The state string that will now be returned by `Email/get` on this account. */
    newState: string;

    /**
     * A map of the creation id to an object containing the `id`, `blobId`, `threadId`, and `size`
     * properties for each successfully imported Email, or `null` if none.
     */
    created: Record<Id, Pick<EmailObject, "id" | "blobId" | "threadId" | "size">> | null;

    /**
     * A map of the creation id to a SetError object for each Email that failed to be created, or
     * `null` if all successful. The possible errors are defined above.
     */
    notCreated: Record<
        Id,
        SetError<
            "create",
            "invalidEmail",
            {
                type: "alreadyExists";
                existingId: Id;
            }
        >
    > | null;
};

/**
 * The arguments for parsing Email objects via an `Email/parse` call
 */
export type EmailParseRequestInvocationArgs = {
    /**
     * The id of the account to use.
     */
    accountId: Id;

    /**
     * The ids of the blobs to parse.
     */
    blobIds: Id[];

    /**
     * If supplied, only the properties listed in the array are returned for each
     * Email object. If omitted, defaults to:
     *
     *     [ "messageId", "inReplyTo", "references", "sender", "from", "to",
     *       "cc", "bcc", "replyTo", "subject", "sentAt", "hasAttachment",
     *       "preview", "bodyValues", "textBody", "htmlBody", "attachments" ]`
     */
    properties?: (keyof EmailObject)[];

    /**
     * A list of properties to fetch for each EmailBodyPart returned. If omitted, defaults to the same value as the Email/get “bodyProperties” default argument.
     */
    bodyProperties?: string[];

    /**
     * (default: false) If true, the bodyValues property includes any text/* part in the textBody property.
     */
    fetchTextBodyValues?: boolean;

    /**
     * (default: false) If true, the bodyValues property includes any text/* part in the htmlBody property.
     */
    fetchHTMLBodyValues?: boolean;

    /**
     * (default: false) If true, the bodyValues property includes any text/* part in the bodyStructure property.
     */
    fetchAllBodyValues?: boolean;

    /**
     * (default: 0) If greater than zero, the value property of any EmailBodyValue object returned in bodyValues MUST be truncated if necessary so it does not exceed this number of octets in size. If 0 (the default), no truncation occurs.
     */
    maxBodyValueBytes?: UnsignedInt;
};

export type EmailParseResponseInvocationArgs = {
    /** The id of the account used for the call. */
    accountId: Id;

    /**
     * A map of blob id to parsed Email representation for each successfully parsed blob, or null if
     * none.
     */
    parsed: Record<Id, EmailObject> | null;

    /**
     * A list of ids given that corresponded to blobs that could not be parsed as Emails, or null if
     * none.
     */
    notParsable: Id[] | null;

    /** A list of blob ids given that could not be found, or null if none. */
    notFound: Id[] | null;
};

/**
 * Union type of all Email capability request invocation arguments
 */
export type EmailRequestInvocationArgs =
    | EmailGetRequestInvocationArgs
    | EmailChangesRequestInvocationArgs
    | EmailQueryRequestInvocationArgs
    | EmailQueryChangesRequestInvocationArgs
    | EmailCopyRequestInvocationArgs
    | EmailSetRequestInvocationArgs
    | EmailImportRequestInvocationArgs
    | EmailParseRequestInvocationArgs;

/**
 * Union type of all Email capability response invocation arguments
 */
export type EmailResponseInvocationArgs =
    | EmailGetResponseInvocationArgs
    | EmailChangesResponseInvocationArgs
    | EmailQueryResponseInvocationArgs
    | EmailQueryChangesResponseInvocationArgs
    | EmailCopyResponseInvocationArgs
    | EmailSetResponseInvocationArgs
    | EmailImportResponseInvocationArgs
    | EmailParseResponseInvocationArgs;
