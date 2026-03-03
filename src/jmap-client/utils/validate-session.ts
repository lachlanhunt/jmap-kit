import type { JMAPSessionFromSchema, Logger } from "../types.js";
import { JMAPSessionSchema } from "../types.js";

/**
 * Parse and validate a JMAP session response using the JMAPSessionSchema.
 *
 * Performs structural validation only (required top-level fields, account shape,
 * presence of the Core server capability key). Capability-specific content
 * validation is performed separately via the capability registry's
 * `validateServerCapabilities()` and `validateAccountCapabilities()` methods.
 *
 * The returned session object is **not** frozen — callers should apply
 * `deepFreeze()` after capability validation has had a chance to strip
 * invalid capabilities from the session.
 *
 * @param jsonResponse The raw JSON response from the server to be validated.
 * @param logger Logger instance used to log validation errors.
 * @returns The parsed and structurally validated session object (mutable).
 * @throws Error if the response does not conform to the JMAPSessionSchema.
 */
export function parseAndValidateJMAPSession(jsonResponse: unknown, logger: Logger): JMAPSessionFromSchema {
    const parseResult = JMAPSessionSchema.safeParse(jsonResponse);
    if (!parseResult.success) {
        logger.error("Invalid JMAP session response", { error: parseResult.error });
        throw new Error("Invalid JMAP session response", {
            cause: parseResult.error,
        });
    }
    return parseResult.data;
}
