import { LIMIT, NOT_JSON, NOT_REQUEST, UNKNOWN_CAPABILITY } from "../../common/registry.js";
import type { HintedString, JMAPRequestErrorTypes, ProblemDetails } from "../../common/types.js";

/**
 * Default error messages for common JMAP request-level error types.
 * These are used as fallbacks when no detail or title is provided.
 */
const DEFAULT_ERROR_MESSAGES: Record<HintedString<JMAPRequestErrorTypes>, string> = {
    [UNKNOWN_CAPABILITY]: "The request included a capability that the server does not support",
    [NOT_JSON]: "The request was not valid JSON or had an incorrect Content-Type",
    [NOT_REQUEST]: "The request did not match the required JMAP request format",
    [LIMIT]: "The request exceeded a server-defined limit",
};

/**
 * Represents a JMAP request-level error.
 *
 * JMAP request-level errors are returned as top-level error objects in the HTTP response,
 * not as part of the methodResponses array. They typically indicate issues with the entire
 * request, such as authentication failures, quota limits, invalid JSON, etc.
 */
export class JMAPRequestError extends Error {
    /**
     * The type URI of the error.
     */
    readonly type: string;

    /**
     * The HTTP status code, if available.
     */
    readonly status?: number;

    /**
     * The raw error response object.
     */
    readonly problemDetails: ProblemDetails<JMAPRequestErrorTypes>;

    /**
     * Creates a new JMAP request error.
     *
     * @param error The error response from the JMAP server.
     */
    constructor(error: ProblemDetails<JMAPRequestErrorTypes>) {
        // Use detail, title, default message for the error type, or finally the type URI itself
        // in order of preference
        const message = error.detail ?? error.title ?? DEFAULT_ERROR_MESSAGES[error.type] ?? error.type;

        super(message);

        this.type = error.type;
        this.status = error.status;
        this.problemDetails = error;
        this.name = "JMAPRequestError";
    }
}
