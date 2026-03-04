import { z } from "zod/v4";
import type { CapabilityDefinition, ValidationPlugin } from "../capability-registry/types.js";
import { EMAIL_CAPABILITY_URI } from "../common/registry.js";
import { Email } from "./email/email.js";
import type { EmailImportRequestInvocationArgs, EmailQueryRequestInvocationArgs } from "./email/types.js";
import { Mailbox } from "./mailbox/mailbox.js";
import type { MailboxSetRequestInvocationArgs } from "./mailbox/types.js";
import { SearchSnippet } from "./searchsnippet/searchsnippet.js";
import { Thread } from "./thread/thread.js";
import { assertInvocation } from "./utils/assert-invocation.js";
import { assertNonNullish } from "./utils/assert-non-nullish.js";
import { createReadOnlyAccountValidator } from "./utils/create-readonly-account-validator.js";

/**
 * Validates that invocations using the Email capability have a valid accountId that supports the Email capability.
 *
 * This plugin performs three critical validation checks:
 * 1. Verifies the invocation includes a valid `accountId` argument (non-empty string)
 * 2. Confirms the account exists in the session's accounts collection
 * 3. Ensures the account's `accountCapabilities` includes the Email capability URI
 *
 * This validation applies to all Email capability invocations (Mailbox, Email, Thread method calls)
 * and implements the account capability checks described in RFC 8621 Section 1.2.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-1.2 | RFC 8621 Section 1.2: Addition to the Capabilities Object}

 */
export const emailAccountSupportPlugin: ValidationPlugin<"invocation"> = {
    name: "email-account-support",
    hook: "invocation",
    trigger: {
        capabilityUri: EMAIL_CAPABILITY_URI,
    },
    validate(context) {
        const { invocation, accounts } = context;
        const accountId = invocation.getArgument("accountId");
        if (typeof accountId !== "string" || accountId === "") {
            return {
                valid: false,
                errors: [new Error(`Invocation is missing a valid accountId argument.`)],
            };
        }
        const account = accounts[accountId];
        if (!account) {
            return {
                valid: false,
                errors: [new Error(`Account "${accountId}" does not exist.`)],
            };
        }
        if (!account.accountCapabilities[EMAIL_CAPABILITY_URI]) {
            return {
                valid: false,
                errors: [new Error(`Account "${accountId}" does not support the Email capability.`)],
            };
        }

        return { valid: true };
    },
};

/**
 * Validates server-defined constraints for Mailbox/set operations.
 *
 * This plugin enforces account-specific mailbox creation limits defined in the Email capability:
 *
 * **Mailbox Name Length (RFC 8621 Section 2.2):**
 * - Validates that mailbox names do not exceed `maxSizeMailboxName` octets (UTF-8 encoded)
 * - The limit is server-defined and specified in the account's Email capability object
 * - Prevents creation attempts that would be rejected by the server
 *
 * **Top-Level Mailbox Creation (RFC 8621 Section 2.2):**
 * - Checks the `mayCreateTopLevelMailbox` server capability
 * - Prevents attempts to create mailboxes with `parentId: null` when the server prohibits it
 * - This restriction varies by server implementation and account type
 *
 * These validations catch client errors before sending requests to the server, providing
 * immediate feedback and avoiding unnecessary network round-trips.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-2.2 | RFC 8621 Section 2.2: Mailboxes}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-1.2 | RFC 8621 Section 1.2: Addition to the Capabilities Object}

 */
export const mailboxSetValidationPlugin: ValidationPlugin<"invocation", MailboxSetRequestInvocationArgs> = {
    name: "mailbox-validation",
    hook: "invocation",
    trigger: {
        capabilityUri: EMAIL_CAPABILITY_URI,
        dataType: "Mailbox",
        method: "set",
    },
    validate(context) {
        const { invocation, accounts } = context;

        assertInvocation(invocation, "Mailbox", "set");

        const accountId = invocation.getArgument("accountId");
        const account = accounts[accountId];

        if (!account) {
            return {
                valid: false,
                errors: [new Error(`Account "${accountId}" does not exist.`)],
            };
        }

        const emailCapability = account.accountCapabilities[EMAIL_CAPABILITY_URI];

        assertNonNullish(emailCapability, "Email capability");

        const create = invocation.getArgument("create");

        if (!create) {
            return { valid: true };
        }

        const errors: Error[] = [];

        // Create a TextEncoder once for UTF-8 encoding
        const encoder = new TextEncoder();

        for (const [clientId, mailbox] of Object.entries(create)) {
            // Validate mailbox name length (in UTF-8 octets)
            const nameOctetLength = encoder.encode(mailbox.name).length;
            if (nameOctetLength > emailCapability.maxSizeMailboxName) {
                errors.push(
                    new Error(
                        `Mailbox name for ${clientId} exceeds maximum length of ${emailCapability.maxSizeMailboxName} octets (actual: ${nameOctetLength} octets)`,
                    ),
                );
            }

            // Validate top-level mailbox creation permission
            if (mailbox.parentId === null && !emailCapability.mayCreateTopLevelMailbox) {
                errors.push(new Error(`Account "${accountId}" does not allow creating top-level mailboxes`));
            }
        }

        if (errors.length > 0) {
            return {
                valid: false,
                errors,
            };
        }

        return { valid: true };
    },
};

/**
 * Validates that Email/query sort properties are supported by the server.
 *
 * **Sort Property Validation (RFC 8621 Section 4.4):**
 * - Checks that all sort properties specified in the `sort` argument are included in the
 *   account's `emailQuerySortOptions` capability
 * - The server defines which Email properties can be used for sorting in queries
 * - Common sort options include `receivedAt`, `from`, `to`, `subject`, `size`, and `hasAttachment`
 * - Server support varies based on implementation and indexing capabilities
 *
 * This validation prevents query errors by catching unsupported sort properties before
 * sending the request. Without this check, the server would reject the query with an
 * `unsupportedSort` error.
 *
 * **Example:**
 * If a server only supports sorting by `receivedAt` and `size`, attempting to sort by
 * `sentAt` would be caught and reported by this validator.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.4 | RFC 8621 Section 4.4: Email/query}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-1.3 | RFC 8621 Section 1.3: Addition to the Capabilities Object (emailQuerySortOptions)}
 */
export const emailQueryValidationPlugin: ValidationPlugin<"invocation", EmailQueryRequestInvocationArgs> = {
    name: "email-validation",
    hook: "invocation",
    trigger: {
        capabilityUri: EMAIL_CAPABILITY_URI,
        dataType: "Email",
        method: "query",
    },
    validate(context) {
        const { invocation, accounts } = context;

        assertInvocation(invocation, "Email", "query");

        const accountId = invocation.getArgument("accountId");
        const account = accounts[accountId];
        if (!account) {
            return {
                valid: false,
                errors: [new Error(`Account ${accountId} does not exist.`)],
            };
        }

        const emailCapability = account.accountCapabilities[EMAIL_CAPABILITY_URI];
        assertNonNullish(emailCapability, "Email capability");

        const sort = invocation.getArgument("sort");

        if (sort) {
            const errors: Error[] = [];
            const { emailQuerySortOptions } = emailCapability;

            for (const { property } of sort) {
                if (!emailQuerySortOptions.includes(property)) {
                    errors.push(
                        new Error(
                            `Unsupported sort property '${property}' for Account ${accountId}. Supported properties: ${emailQuerySortOptions.join(", ")}`,
                        ),
                    );
                }
            }

            if (errors.length > 0) {
                return {
                    valid: false,
                    errors,
                };
            }
        }

        return { valid: true };
    },
};

/**
 * Prevents Email/import operations on read-only accounts.
 *
 * **Read-Only Account Protection (RFC 8620 Section 2, RFC 8621 Section 4.8):**
 * - Validates that the target account's `isReadOnly` property is `false`
 * - Read-only accounts cannot accept data modification operations
 * - Email/import creates new Email objects, which requires write access
 * - Attempting to import into a read-only account would fail with an `accountReadOnly` error
 *
 * This validator catches the error client-side before making a server request, providing
 * immediate feedback when attempting invalid operations on read-only accounts.
 *
 * **Common read-only scenarios:**
 * - Shared mailboxes with read-only permissions
 * - Archive accounts
 * - Accounts in maintenance mode
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.8 | RFC 8621 Section 4.8: Email/import}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-2 | RFC 8620 Section 2: The JMAP Session Resource}
 */
export const preventEmailImportOnReadOnlyAccountPlugin: ValidationPlugin<
    "invocation",
    EmailImportRequestInvocationArgs
> = createReadOnlyAccountValidator<EmailImportRequestInvocationArgs>({
    name: "email-prevent-import-on-readonly-account",
    trigger: {
        dataType: "Email",
        method: "import",
    },
});

const emailAccountCapabilitySchema = z.looseObject({
    maxMailboxesPerEmail: z.number().int().min(1).nullable(),
    maxMailboxDepth: z.number().int().min(1).nullable(),
    maxSizeMailboxName: z.number().int().min(100),
    maxSizeAttachmentsPerEmail: z.number().int().min(0),
    emailQuerySortOptions: z.array(z.string()),
    mayCreateTopLevelMailbox: z.boolean(),
});

/**
 * Defines the Email capability, including all its associated invocations
 * (Mailbox, Thread, Email, SearchSnippet) and validation plugins.
 */
export const EmailCapability = {
    uri: EMAIL_CAPABILITY_URI,
    invocations: {
        Mailbox,
        Thread,
        Email,
        SearchSnippet,
    },
    validators: [
        emailAccountSupportPlugin,
        mailboxSetValidationPlugin,
        emailQueryValidationPlugin,
        preventEmailImportOnReadOnlyAccountPlugin,
    ],
    schema: { accountCapability: emailAccountCapabilitySchema },
} satisfies CapabilityDefinition;

declare module "../common/types.js" {
    interface ServerCapabilityRegistry {
        [EMAIL_CAPABILITY_URI]?: EmptyObject;
    }
    interface AccountCapabilityRegistry {
        [EMAIL_CAPABILITY_URI]?: {
            /**
             * The maximum number of Mailboxes that can be can assigned to a single Email object.
             * This MUST be an integer >= 1, or null for no limit (or rather, the limit is always
             * the number of Mailboxes in the account).
             */
            maxMailboxesPerEmail: UnsignedInt | null;

            /**
             * The maximum depth of the Mailbox hierarchy (i.e., one more than the maximum number of
             * ancestors a Mailbox may have), or null for no limit.
             */
            maxMailboxDepth: UnsignedInt | null;

            /**
             * The maximum length, in (UTF-8) octets, allowed for the name of a Mailbox.
             * This MUST be at least 100, although it is recommended servers allow more.
             */
            maxSizeMailboxName: UnsignedInt;

            /**
             * The maximum total size of attachments, in octets, allowed for a single Email object.
             * A server MAY still reject the import or creation of an Email with a lower attachment
             * size total (for example, if the body includes several megabytes of text, causing the
             * size of the encoded MIME structure to be over some server-defined limit).
             *
             * Note that this limit is for the sum of unencoded attachment sizes. Users are generally
             * not knowledgeable about encoding overhead, etc., nor should they need to be, so
             * marketing and help materials normally tell them the "max size attachments". This is the
             * unencoded size they see on their hard drive, so this capability matches that and allows
             * the client to consistently enforce what the user understands as the limit.
             *
             * The server may separately have a limit for the total size of the message [@!RFC5322],
             * created by combining the attachments (often base64 encoded) with the message headers and
             * bodies. For example, suppose the server advertises 50 MB:
             *
             *     maxSizeAttachmentsPerEmail: 50000000
             *
             * The enforced server limit may be for a message size of 70000000 octets. Even with base64
             * encoding and a 2 MB HTML body, 50 MB attachments would fit under this limit.
             */
            maxSizeAttachmentsPerEmail: UnsignedInt;

            /**
             * A list of all the values the server supports for the "property" field of the Comparator
             * object in an Email/query sort (see Section 4.4.2). This MAY include properties the client
             * does not recognise (for example, custom properties specified in a vendor extension).
             * Clients MUST ignore any unknown properties in the list.
             */
            emailQuerySortOptions: string[];

            /**
             * If true, the user may create a Mailbox in this account with a null parentId.
             * (Permission for creating a child of an existing Mailbox is given by the myRights property
             * on that Mailbox.)
             */
            mayCreateTopLevelMailbox: boolean;
        };
    }
}
