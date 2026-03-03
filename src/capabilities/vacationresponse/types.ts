import type { Id, UTCDate } from "../../common/types.js";
import type {
    BaseGetRequestInvocationArgs,
    BaseGetResponseInvocationArgs,
    BaseSetRequestInvocationArgs,
    BaseSetResponseInvocationArgs,
} from "../../invocation/types.js";

/**
 * VacationResponseObject properties set by the server. These cannot be set by a
 * `VacationResponse/set` call.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-8 | RFC 8621 Section 8: Vacation Response}
 */
export type VacationResponseObjectServerSet = Readonly<{
    /**
     * (immutable; server-set) The id of the object. There is only ever one VacationResponse
     * object, and its id is `singleton`.
     */
    id: Id;
}>;

/**
 * VacationResponseObject properties that may be set via a `VacationResponse/set` call.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-8 | RFC 8621 Section 8: Vacation Response}
 */
export type VacationResponseObjectSettable = {
    /**
     * Should a vacation response be sent if a message arrives between the `fromDate`
     * and `toDate`?
     */
    isEnabled: boolean;

    /**
     * If `isEnabled` is `true`, messages that arrive on or after this date-time (but before
     * the `toDate` if defined) should receive the user's vacation response. If `null`, the
     * vacation response is effective immediately.
     */
    fromDate?: UTCDate | null;

    /**
     * If `isEnabled` is `true`, messages that arrive before this date-time (but on or after
     * the `fromDate` if defined) should receive the user's vacation response. If `null`, the
     * vacation response is effective indefinitely.
     */
    toDate?: UTCDate | null;

    /**
     * The subject that will be used by the message sent in response to messages when the
     * vacation response is enabled. If `null`, an appropriate subject SHOULD be set by the
     * server.
     */
    subject?: string | null;

    /**
     * The plaintext body to send in response to messages when the vacation response is enabled.
     * If this is `null`, the server SHOULD generate a plaintext body part from the `htmlBody`
     * when sending vacation responses but MAY choose to send the response as HTML only. If both
     * `textBody` and `htmlBody` are `null`, an appropriate default body SHOULD be generated for
     * responses by the server.
     */
    textBody?: string | null;

    /**
     * The HTML body to send in response to messages when the vacation response is enabled.
     * If this is `null`, the server MAY choose to generate an HTML body part from the
     * `textBody` when sending vacation responses or MAY choose to send the response as
     * plaintext only.
     */
    htmlBody?: string | null;
};

/**
 * Properties of the VacationResponse object.
 *
 * A VacationResponse object represents the state of vacation-response-related settings for an
 * account. There is only ever one VacationResponse object in an account, and its id is `singleton`.
 *
 * Automated message sending can produce undesirable behaviour. To avoid this, implementors MUST
 * follow the recommendations set forth in {@link https://www.rfc-editor.org/rfc/rfc3834.html RFC 3834}.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-8 | RFC 8621 Section 8: Vacation Response}
 */
export type VacationResponseObject = VacationResponseObjectServerSet & VacationResponseObjectSettable;

/**
 * The arguments for fetching VacationResponse objects via a `VacationResponse/get` call.
 *
 * There MUST only be exactly one VacationResponse object in an account. It MUST have
 * the id `singleton`.
 */
export type VacationResponseGetRequestInvocationArgs = BaseGetRequestInvocationArgs<VacationResponseObject>;

/**
 * The response to a `VacationResponse/get` call.
 */
export type VacationResponseGetResponseInvocationArgs = BaseGetResponseInvocationArgs<VacationResponseObject>;

/**
 * The arguments for creating, updating, and destroying VacationResponse objects via a
 * `VacationResponse/set` call.
 */
export type VacationResponseSetRequestInvocationArgs = BaseSetRequestInvocationArgs<VacationResponseObjectSettable>;

/**
 * The response to a `VacationResponse/set` call.
 */
export type VacationResponseSetResponseInvocationArgs = BaseSetResponseInvocationArgs<VacationResponseObject>;

/**
 * Union type of all VacationResponse capability request invocation arguments.
 */
export type VacationResponseRequestInvocationArgs =
    | VacationResponseGetRequestInvocationArgs
    | VacationResponseSetRequestInvocationArgs;

/**
 * Union type of all VacationResponse capability response invocation arguments.
 */
export type VacationResponseResponseInvocationArgs =
    | VacationResponseGetResponseInvocationArgs
    | VacationResponseSetResponseInvocationArgs;
