import type { CapabilityDefinition, ValidationPlugin } from "../capability-registry/types.js";
import { MASKED_EMAIL_CAPABILITY_URI } from "../common/registry.js";
import { MaskedEmail } from "./maskedemail/maskedemail.js";
import type { MaskedEmailObjectSettable, MaskedEmailSetRequestInvocationArgs } from "./maskedemail/types.js";
import { assertInvocation } from "./utils/assert-invocation.js";

/**
 * Validates that invocations using the MaskedEmail capability have a valid accountId that supports
 * the MaskedEmail capability.
 *
 * This plugin performs three critical validation checks:
 * 1. Verifies the invocation includes a valid `accountId` argument (non-empty string)
 * 2. Confirms the account exists in the session's accounts collection
 * 3. Ensures the account's `accountCapabilities` includes the MaskedEmail capability URI
 *
 * This validation applies to all MaskedEmail capability invocations (MaskedEmail/get, MaskedEmail/set)
 * and implements the account capability checks for the FastMail Masked Email extension.
 *
 * @see {@link https://www.fastmail.com/dev/#masked-email-api | FastMail Developer Documentation - Masked Email API}
 */
export const maskedEmailAccountSupportPlugin: ValidationPlugin<"invocation"> = {
    name: "maskedemail-account-support",
    hook: "invocation",
    trigger: {
        capabilityUri: MASKED_EMAIL_CAPABILITY_URI,
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
        if (!account.accountCapabilities[MASKED_EMAIL_CAPABILITY_URI]) {
            return {
                valid: false,
                errors: [new Error(`Account "${accountId}" does not support the MaskedEmail capability.`)],
            };
        }

        return { valid: true };
    },
};

/**
 * Validates emailPrefix constraints for MaskedEmail creation.
 *
 * This plugin enforces FastMail's requirements for the emailPrefix property:
 *
 * **Email Prefix Constraints:**
 * - Must be 64 characters or less
 * - May only contain lowercase letters (a-z), digits (0-9), and underscores (_)
 * - Only applicable during MaskedEmail creation (not updates)
 *
 * The emailPrefix is an optional property that allows clients to suggest a prefix for the
 * generated masked email address. If not provided, the server generates one automatically.
 *
 * These validations catch invalid prefixes before sending requests to the server, providing
 * immediate feedback and avoiding unnecessary network round-trips.
 *
 * @see {@link https://www.fastmail.com/dev/#masked-email-api | FastMail Developer Documentation - Masked Email API}
 */
export const maskedEmailPrefixValidationPlugin: ValidationPlugin<"invocation", MaskedEmailSetRequestInvocationArgs> = {
    name: "maskedemail-prefix-validation",
    hook: "invocation",
    trigger: {
        dataType: "MaskedEmail",
        method: "set",
    },
    validate(context) {
        const { invocation } = context;

        assertInvocation(invocation, "MaskedEmail", "set");

        const create = invocation.getArgument("create");
        if (!create || typeof create !== "object") {
            return { valid: true }; // No creations to validate
        }

        const errors: Error[] = [];
        const prefixPattern = /^[a-z0-9_]+$/;

        for (const [creationId, maskedEmail] of Object.entries(create)) {
            const { emailPrefix } = maskedEmail;

            if (emailPrefix !== undefined) {
                // Check length constraint
                if (emailPrefix.length > 64) {
                    errors.push(
                        new Error(
                            `MaskedEmail "${creationId}" has emailPrefix of ${emailPrefix.length} characters, but maximum is 64`,
                        ),
                    );
                }

                // Check character constraint
                if (!prefixPattern.test(emailPrefix)) {
                    errors.push(
                        new Error(
                            `MaskedEmail "${creationId}" has invalid emailPrefix. Only lowercase letters (a-z), digits (0-9), and underscores (_) are allowed`,
                        ),
                    );
                }
            }
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        return { valid: true };
    },
};

/**
 * Validates MaskedEmail state transition constraints.
 *
 * This plugin enforces FastMail's state machine rules for MaskedEmail objects:
 *
 * **State Transition Rules:**
 * - Once a MaskedEmail transitions from "pending" to any other state, it cannot be set back to "pending"
 * - Valid states: "pending", "enabled", "disabled", "deleted"
 * - State can transition: pending → enabled/disabled/deleted
 * - State can transition: enabled ⟷ disabled ⟷ deleted
 * - State cannot transition: enabled/disabled/deleted → pending
 *
 * **Automatic Transitions:**
 * - Pending addresses automatically become "enabled" when they receive their first message
 * - Pending addresses are automatically deleted after 24 hours if unused
 *
 * This validation prevents invalid state transitions during updates, catching errors before
 * they reach the server.
 *
 * @see {@link https://www.fastmail.com/dev/#masked-email-api | FastMail Developer Documentation - Masked Email API}
 */
export const maskedEmailStateValidationPlugin: ValidationPlugin<"invocation", MaskedEmailSetRequestInvocationArgs> = {
    name: "maskedemail-state-validation",
    hook: "invocation",
    trigger: {
        dataType: "MaskedEmail",
        method: "set",
    },
    validate(context) {
        const { invocation } = context;

        assertInvocation(invocation, "MaskedEmail", "set");

        const update = invocation.getArgument("update");
        if (!update || typeof update !== "object") {
            return { valid: true }; // No updates to validate
        }

        const errors: Error[] = [];

        for (const [id, patch] of Object.entries(update)) {
            const updateData = patch as Partial<MaskedEmailObjectSettable>;
            const { state } = updateData;

            // Check if trying to set state back to pending
            if (state === "pending") {
                errors.push(
                    new Error(
                        `MaskedEmail "${id}" cannot be set to "pending" state. Once transitioned from pending, it cannot be set back`,
                    ),
                );
            }
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        return { valid: true };
    },
};

/**
 * Defines the MaskedEmail capability, including MaskedEmail invocations and validation plugins
 * for the FastMail Masked Email extension.
 *
 * **Note:** Read-only account protection for MaskedEmail/set is handled by Core's generic
 * `preventSetOnReadOnlyAccountPlugin`, which validates all `/set` methods.
 */
export const MaskedEmailCapability = {
    uri: MASKED_EMAIL_CAPABILITY_URI,
    invocations: {
        MaskedEmail,
    },
    validators: [maskedEmailAccountSupportPlugin, maskedEmailPrefixValidationPlugin, maskedEmailStateValidationPlugin],
} satisfies CapabilityDefinition;

declare module "../common/types.js" {
    interface ServerCapabilityRegistry {
        [MASKED_EMAIL_CAPABILITY_URI]?: EmptyObject;
    }
    interface AccountCapabilityRegistry {
        [MASKED_EMAIL_CAPABILITY_URI]?: EmptyObject;
    }
}
