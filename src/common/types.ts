import { z } from "zod/v4";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CapabilityRegistryInterface } from "../capability-registry/types.js"; // For TSDoc references
import type {
    ADDRESSBOOK_DATA_TYPE,
    BLOB_CAPABILITY_URI,
    BLOB_DATA_TYPE,
    CALENDAREVENTNOTIFICATION_DATA_TYPE,
    CALENDAREVENT_DATA_TYPE,
    CALENDARS_CAPABILITY_URI,
    CALENDARS_PARSE_CAPABILITY_URI,
    CALENDAR_DATA_TYPE,
    CONTACTCARD_DATA_TYPE,
    CONTACTS_CAPABILITY_URI,
    CORE_DATA_TYPE,
    EMAILDELIVERY_DATA_TYPE,
    EMAILSUBMISSION_DATA_TYPE,
    EMAIL_CAPABILITY_URI,
    EMAIL_DATA_TYPE,
    IDENTITY_DATA_TYPE,
    LIMIT,
    MAILBOX_DATA_TYPE,
    MASKED_EMAIL_CAPABILITY_URI,
    MASKED_EMAIL_TYPE,
    MDN_CAPABILITY_URI,
    MDN_DATA_TYPE,
    NOT_JSON,
    NOT_REQUEST,
    PARTICIPANTIDENTITY_DATA_TYPE,
    PRINCIPALS_AVAILABILITY_CAPABILITY_URI,
    PRINCIPALS_CAPABILITY_URI,
    PRINCIPALS_OWNER_CAPABILITY_URI,
    PRINCIPAL_DATA_TYPE,
    PUSHSUBSCRIPTION_DATA_TYPE,
    QUOTA_CAPABILITY_URI,
    QUOTA_DATA_TYPE,
    SEARCHSNIPPET_DATA_TYPE,
    SHARENOTIFICATION_DATA_TYPE,
    SIEVESCRIPT_DATA_TYPE,
    SMIMEVERIFY_CAPABILITY_URI,
    SUBMISSION_CAPABILITY_URI,
    TASKS_ALERTS_CAPABILITY_URI,
    TASKS_ASSIGNEES_CAPABILITY_URI,
    TASKS_CAPABILITY_URI,
    TASKS_CUSTOMTIMEZONES_CAPABILITY_URI,
    TASKS_MULTILINGUAL_CAPABILITY_URI,
    TASKS_RECURRENCES_CAPABILITY_URI,
    THREAD_DATA_TYPE,
    UNKNOWN_CAPABILITY,
    VACATIONRESPONSE_CAPABILITY_URI,
    VACATIONRESPONSE_DATA_TYPE,
    WEBPUSH_VAPID_CAPABILITY_URI,
} from "./registry.js";
import { CORE_CAPABILITY_URI } from "./registry.js";

/**
 * Any primitive, object or array value that can be represented in JSON
 */
export type JSONValue = string | number | boolean | null | { [member: string]: JSONValue } | JSONValue[];

/**
 * An empty object
 */
export type EmptyObject = Record<string | symbol, never>;

/**
 * Any string value, with some known suggested values that may be used.
 */
export type HintedString<KnownValues extends string> = (string & {}) | KnownValues; // NOSONAR

/**
 * From `T`, make the specified properties in the union `K` required,
 * and make all other properties optional
 */
export type RequireSome<T, K extends keyof T> = Required<Pick<T, K>> & Partial<Omit<T, K>>;

/**
 * A type that can be either a value of type `T` or a Promise that resolves to a value of type `T`.
 */
export type MaybePromise<T> = T | Promise<T>;

// The following types are defined in the JMAP Core specification.
// Their content cannot be more strictly enforced by TypeScript beyond the available primitives.

/**
 * A string of at least 1 and a maximum of 255 octets in size, and it MUST only contain
 * characters from the “URL and Filename Safe” base64 alphabet, as defined in Section 5
 * of {@link https://www.rfc-editor.org/rfc/rfc4648.html RFC 4648}, excluding the pad character
 * (`=`). This means the allowed characters are the ASCII alphanumeric characters
 * (`A-Za-z0-9`), hyphen (`-`), and underscore (`_`).
 */
export type Id = string & {}; // NOSONAR

/**
 * An integer in the range -2^53+1 <= value <= 2^53-1, the safe range for integers stored
 * in a floating-point double, represented as a JSON `Number`.
 */
export type Int = number & {}; // NOSONAR

/**
 * An `Int` where the value MUST be in the range 0 <= value <= 2^53-1.
 */
export type UnsignedInt = number & {}; // NOSONAR

/**
 * A string in date-time format {@link https://www.rfc-editor.org/rfc/rfc3339.html RFC 3339}.
 * To ensure a normalised form, the time-secfrac MUST always be omitted if zero, and
 * any letters in the string (e.g., “`T`” and “`Z`”) MUST be uppercase.
 *
 * For example, `"2014-10-30T14:12:00+08:00"`.
 */
export type TZDate = string & {}; // NOSONAR

/**
 * A `Date` where the time-offset component MUST be `Z` (i.e., it must be in UTC time).
 *
 * For example, `"2014-10-30T06:12:00Z"`.
 */
export type UTCDate = string & {}; // NOSONAR

/**
 * The list of data types defined in various JMAP specifications, including the core specification and extensions.
 * This is not an exhaustive list of all possible data types, as servers may support additional private data types as well.
 */
export type JMAPDataType = HintedString<
    | CORE_DATA_TYPE
    | BLOB_DATA_TYPE
    | PUSHSUBSCRIPTION_DATA_TYPE
    | MAILBOX_DATA_TYPE
    | THREAD_DATA_TYPE
    | EMAIL_DATA_TYPE
    | EMAILDELIVERY_DATA_TYPE
    | SEARCHSNIPPET_DATA_TYPE
    | IDENTITY_DATA_TYPE
    | EMAILSUBMISSION_DATA_TYPE
    | VACATIONRESPONSE_DATA_TYPE
    | MDN_DATA_TYPE
    | QUOTA_DATA_TYPE
    | SIEVESCRIPT_DATA_TYPE
    | PRINCIPAL_DATA_TYPE
    | SHARENOTIFICATION_DATA_TYPE
    | ADDRESSBOOK_DATA_TYPE
    | CONTACTCARD_DATA_TYPE
    | CALENDAR_DATA_TYPE
    | CALENDAREVENT_DATA_TYPE
    | CALENDAREVENTNOTIFICATION_DATA_TYPE
    | PARTICIPANTIDENTITY_DATA_TYPE
    | MASKED_EMAIL_TYPE
>;

/**
 * The list of method names defined in the JMAP core specification ({@link https://www.rfc-editor.org/rfc/rfc8620.html RFC 8620}).
 */
export type JMAPMethodName = HintedString<
    "changes" | "copy" | "echo" | "get" | "import" | "lookup" | "parse" | "query" | "queryChanges" | "set" | "upload"
>;

/**
 * Zod schema for JMAPServerCapabilities.
 *
 * Validates the structural requirement that the Core capability key is present.
 * Content validation of individual capabilities is handled by each capability's
 * own StandardSchema, validated via {@link CapabilityRegistryInterface.validateServerCapabilities}.
 */
export const JMAPServerCapabilitiesSchema = z.looseObject({
    [CORE_CAPABILITY_URI]: z.looseObject({}),
});

/**
 * Registry of known server capability properties.
 *
 * This interface can be augmented by third-party plugins using `declare module` to add
 * type-safe capability properties. `JMAPServerCapabilities` extends this interface
 * and automatically picks up augmented properties.
 *
 * @example
 * ```typescript
 * declare module "jmap-kit" {
 *     interface ServerCapabilityRegistry {
 *         "https://example.com/custom-capability"?: { customProp: string };
 *     }
 * }
 * ```
 */
export interface ServerCapabilityRegistry {
    [key: string & {}]: unknown; // NOSONAR
}

/**
 * JMAPServerCapabilities
 *
 * Capabilities supported by the server, keyed by capability URI.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-2 RFC 8620 Section 2 - The JMAP Session Resource}
 */
export interface JMAPServerCapabilities extends ServerCapabilityRegistry {
    [key: string & {}]: unknown; // NOSONAR
}

/**
 * Zod schema for JMAPAccountCapabilities.
 *
 * Validates the structural shape of account capabilities. Content validation of individual
 * capabilities is handled by each capability's own StandardSchema, validated via
 * {@link CapabilityRegistryInterface.validateAccountCapabilities}.
 */
export const JMAPAccountCapabilitiesSchema = z.looseObject({});

/**
 * Registry of known account capability properties.
 *
 * This interface can be augmented by third-party plugins using `declare module` to add
 * type-safe capability properties. `JMAPAccountCapabilities` extends this interface
 * and automatically picks up augmented properties.
 *
 * @example
 * ```typescript
 * declare module “jmap-kit” {
 *     interface AccountCapabilityRegistry {
 *         “https://example.com/custom-capability”?: { customProp: string };
 *     }
 * }
 * ```
 */
export interface AccountCapabilityRegistry {
    [key: string & {}]: unknown; // NOSONAR
}

/**
 * JMAPAccountCapabilities
 *
 * Capabilities supported by an account, keyed by capability URI.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-1.6.2 RFC 8620 Section 1.6.2 - Accounts}
 */
export interface JMAPAccountCapabilities extends AccountCapabilityRegistry {
    [key: string & {}]: unknown; // NOSONAR
}

/**
 * A capability is referenced by a URI. The JMAP capability URI can be a URN
 * starting with urn:ietf:params:jmap: plus a unique suffix that is the index
 * value in the jmap URN sub-namespace. These are registered in the
 * {@link https://www.iana.org/assignments/jmap/jmap.xhtml JMAP Capabilities Register}.
 *
 * Identifiers for vendor extensions MUST be a URL belonging to a domain owned by
 * the vendor, to avoid conflict. The URL SHOULD resolve to documentation for the
 * changes the extension makes.
 *
 * This is the list of Capability URIs declared via the ServerCapabilityRegistry.
 *
 * @see {@link JMAPCapabilityUri}
 *
 */
export type JMAPCapability = keyof JMAPServerCapabilities;

/**
 * A capability is referenced by a URI. The JMAP capability URI can be a URN
 * starting with urn:ietf:params:jmap: plus a unique suffix that is the index
 * value in the jmap URN sub-namespace. These are registered in the
 * {@link https://www.iana.org/assignments/jmap/jmap.xhtml JMAP Capabilities Register}.
 *
 * Identifiers for vendor extensions MUST be a URL belonging to a domain owned by
 * the vendor, to avoid conflict. The URL SHOULD resolve to documentation for the
 * changes the extension makes.
 *
 * The` list of capability URIs defined in the JMAP core specification and extensions.
 * This is not an exhaustive list of all possible capabilities, as servers may support
 * additional private capabilities as well; or newer capabilities defined in future
 * specifications.
 *
 * @see {@link JMAPCapability}
 */
export type JMAPCapabilityUri =
    | HintedString<
          | BLOB_CAPABILITY_URI
          | CORE_CAPABILITY_URI
          | EMAIL_CAPABILITY_URI
          | SUBMISSION_CAPABILITY_URI
          | VACATIONRESPONSE_CAPABILITY_URI
          | MDN_CAPABILITY_URI
          | SMIMEVERIFY_CAPABILITY_URI
          | QUOTA_CAPABILITY_URI
          | WEBPUSH_VAPID_CAPABILITY_URI
          | CALENDARS_CAPABILITY_URI
          | CALENDARS_PARSE_CAPABILITY_URI
          | PRINCIPALS_CAPABILITY_URI
          | PRINCIPALS_AVAILABILITY_CAPABILITY_URI
          | PRINCIPALS_OWNER_CAPABILITY_URI
          | CONTACTS_CAPABILITY_URI
          | TASKS_CAPABILITY_URI
          | TASKS_RECURRENCES_CAPABILITY_URI
          | TASKS_ASSIGNEES_CAPABILITY_URI
          | TASKS_ALERTS_CAPABILITY_URI
          | TASKS_MULTILINGUAL_CAPABILITY_URI
          | TASKS_CUSTOMTIMEZONES_CAPABILITY_URI
          | MASKED_EMAIL_CAPABILITY_URI
      >
    | JMAPCapability;

/**
 * A map of a (client-specified) creation id to the id the server assigned when
 * a record was successfully created.
 */
export type IdMap = Record<Id, Id>; // Map from client-specified IDs to server assigned IDs

// The following types represent the serialised JMAP data structures that would be sent over the wire.

/**
 * To allow clients to make more efficient use of the network and avoid round trips,
 * an argument to one method can be taken from the result of a previous method call
 * in the same request.
 */
export interface JMAPResultReference {
    /**
     * The method call id of a previous method call in the current request.
     */
    resultOf: string;

    /**
     * The required name of a response to that method call.
     */
    name: string;

    /**
     * A pointer into the arguments of the response selected via the name and resultOf properties.
     * This is a JSON Pointer {@link https://www.rfc-editor.org/rfc/rfc6901.html RFC 6901}, except it also
     * allows the use of `*` to map through an array.
     */
    path: string;
}

/**
 * An object containing named arguments for a method request.
 *
 * The value of property names starting with a hash (`#`) must be Result References.
 * All other property names may have any suitable value.
 */
export interface JMAPRequestInvocationArgs {
    /**
     * A named argument for a method.
     */
    [key: string]: JSONValue;

    /**
     * A Result Reference to the result of a previous method call in a request.
     */
    [ref: `#${string}`]: Omit<JSONValue & JMAPResultReference, "member">;
}

/**
 * An object containing named arguments for a method response.
 */
export interface JMAPResponseInvocationArgs {
    /**
     * A named argument for a method.
     */
    [key: string]: JSONValue;

    /**
     * A Result Reference to the result of a previous method call cannot appear in a response.
     */
    [ref: `#${string}`]: never;
}

/**
 * An object containing named arguments for a method response that represents an error.
 */
export type JMAPResponseInvocationErrorArgs = JMAPResponseInvocationArgs & {
    /**
     * The type of error that occurred, as a string. This is a HintedString, so it can be any string, but the JMAP core specification defines some known error types that servers may use.
     */
    type: HintedString<
        // Method-level errors (RFC 8620 Section 3.6.2)
        | "serverUnavailable"
        | "serverFail"
        | "serverPartialFail"
        | "unknownMethod"
        | "invalidArguments"
        | "invalidResultReference"
        | "forbidden"
        | "accountNotFound"
        | "accountNotSupportedByMethod"
        | "accountReadOnly"
        // Standard method errors (RFC 8620 Sections 5.1–5.8)
        | "requestTooLarge"
        | "cannotCalculateChanges"
        | "stateMismatch"
        | "anchorNotFound"
        | "unsupportedSort"
        | "unsupportedFilter"
        | "tooManyChanges"
    >;
    /**
     * A human-readable description of the error, which may be used for debugging or logging purposes.
     */
    description?: string;
};

/**
 * This is a tuple, represented as a JSON array containing three elements:
 *
 * - The name of the method to call.
 * - An object containing named arguments for that method request.
 * - The method call id: an arbitrary string from the client to be echoed
 *   back with the responses emitted by that method call.
 */
export type JMAPRequestInvocation = [name: string, args: JMAPRequestInvocationArgs, methodCallId: Id];

/**
 * This is a tuple, represented as a JSON array containing three elements:
 *
 * - The name of the method response.
 * - An object containing named arguments for that response.
 * - The method call id: an arbitrary string from corresponding request method set by the client
 */
export type JMAPResponseInvocation = [name: string, args: JMAPResponseInvocationArgs, methodCallId: Id];

/**
 * A Request object.
 */
export type JMAPRequest = {
    /**
     * The set of capabilities the client wishes to use. The client MAY include
     * capability identifiers even if the method calls it makes do not utilise
     * those capabilities.
     */
    using: JMAPCapability[];

    /**
     * An array of method calls to process on the server.
     */
    methodCalls: JMAPRequestInvocation[];

    /**
     * An optional map of a (client-specified) creation id to the id the server
     * assigned when a record was successfully created.
     */
    createdIds?: IdMap;
};

/**
 * A Response object.
 */
export type JMAPResponse = {
    /**
     * An array of responses, in the same format as the methodCalls on the Request object.
     */
    methodResponses: JMAPResponseInvocation[];

    /**
     * A map of a (client-specified) creation id to the id the server assigned
     * when a record was successfully created.
     */
    createdIds?: IdMap;

    /**
     * The current value of the `state` string on the Session object.
     */
    sessionState: string;
};

/**
 * Known JMAP request-level error types defined in the JMAP core specification (RFC 8620).
 */
export type JMAPRequestErrorTypes = UNKNOWN_CAPABILITY | NOT_JSON | NOT_REQUEST | LIMIT;

/**
 * Structure of a Problem Details object used for JMAP request-level error responses.
 *
 * This follows {@link https://www.rfc-editor.org/rfc/rfc7807.html RFC 7807} "Problem Details for HTTP APIs" format.
 */
export interface ProblemDetails<T extends string = string> {
    /**
     * A URI reference that identifies the problem type.
     * When dereferenced, it SHOULD provide human-readable documentation for the problem type.
     * This MUST be a string in URI format.
     */
    type: HintedString<T>;

    /**
     * A short, human-readable summary of the problem type.
     * It SHOULD NOT change from occurrence to occurrence of the problem,
     * except for purposes of localization.
     */
    title?: string;

    /**
     * The HTTP status code for this occurrence of the problem.
     */
    status?: number;

    /**
     * A human-readable explanation specific to this occurrence of the problem.
     */
    detail?: string;

    /**
     * A URI reference that identifies the specific occurrence of the problem.
     */
    instance?: string;

    /**
     * Additional properties specific to the problem type.
     */
    [key: string]: JSONValue | undefined;
}
