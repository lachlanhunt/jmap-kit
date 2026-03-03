import { z } from "zod/v4";
import type { CapabilityDefinition, ValidationPlugin } from "../capability-registry/types.js";
import { SUBMISSION_CAPABILITY_URI } from "../common/registry.js";
import type { EmptyObject, UnsignedInt } from "../common/types.js";
import { EmailSubmission } from "./emailsubmission/emailsubmission.js";
import { Identity } from "./identity/identity.js";

/**
 * Validates that invocations using the Submission capability have a valid accountId that supports
 * the Submission capability.
 *
 * This plugin performs three critical validation checks:
 * 1. Verifies the invocation includes a valid `accountId` argument (non-empty string)
 * 2. Confirms the account exists in the session's accounts collection
 * 3. Ensures the account's `accountCapabilities` includes the Submission capability URI
 *
 * This validation applies to all Submission capability invocations (Identity and EmailSubmission
 * method calls) and implements the account capability checks described in RFC 8621 Section 1.3.2.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-1.3.2 | RFC 8621 Section 1.3.2: The Submission Capability}
 */
export const submissionAccountSupportPlugin: ValidationPlugin<"invocation"> = {
    name: "submission-account-support",
    hook: "invocation",
    trigger: {
        capabilityUri: SUBMISSION_CAPABILITY_URI,
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
        if (!account.accountCapabilities[SUBMISSION_CAPABILITY_URI]) {
            return {
                valid: false,
                errors: [new Error(`Account "${accountId}" does not support the Submission capability.`)],
            };
        }

        return { valid: true };
    },
};

/**
 * Defines the Submission capability, including all its associated invocations
 * (EmailSubmission, Identity) and validation plugins.
 *
 * Per RFC 8621 Section 1.3.2, the `urn:ietf:params:jmap:submission` capability represents support
 * for the Identity and EmailSubmission data types and associated API methods.
 *
 * Read-only account protection for `/set` methods is handled by Core's generic
 * `preventSetOnReadOnlyAccountPlugin`.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-1.3.2 | RFC 8621 Section 1.3.2: The Submission Capability}
 */
const submissionAccountCapabilitySchema = z.looseObject({
    maxDelayedSend: z.number().int().min(0),
    submissionExtensions: z.record(z.string(), z.array(z.string())),
});

export const SubmissionCapability = {
    uri: SUBMISSION_CAPABILITY_URI,
    invocations: {
        EmailSubmission,
        Identity,
    },
    validators: [submissionAccountSupportPlugin],
    schema: { accountCapability: submissionAccountCapabilitySchema },
} satisfies CapabilityDefinition;

declare module "../common/types.js" {
    interface ServerCapabilityRegistry {
        [SUBMISSION_CAPABILITY_URI]?: EmptyObject;
    }
    interface AccountCapabilityRegistry {
        [SUBMISSION_CAPABILITY_URI]?: {
            /**
             * The number in seconds of the maximum delay the server supports in sending. This is 0 if
             * the server does not support delayed send.
             */
            maxDelayedSend: UnsignedInt;

            /**
             * The set of SMTP submission extensions supported by the server, which the client may use
             * when creating an EmailSubmission object (see Section 7). Each key in the object is the
             * ehlo-name, and the value is a list of ehlo-args.
             */
            submissionExtensions: Record<string, string[]>;
        };
    }
}
