import type { CapabilityDefinition, ValidationPlugin } from "../capability-registry/types.js";
import { VACATIONRESPONSE_CAPABILITY_URI } from "../common/registry.js";
import { VacationResponse } from "./vacationresponse/vacationresponse.js";

/**
 * Validates that invocations using the VacationResponse capability have a valid accountId that
 * supports the VacationResponse capability.
 *
 * This plugin performs three critical validation checks:
 * 1. Verifies the invocation includes a valid `accountId` argument (non-empty string)
 * 2. Confirms the account exists in the session's accounts collection
 * 3. Ensures the account's `accountCapabilities` includes the VacationResponse capability URI
 *
 * This validation applies to all VacationResponse capability invocations (VacationResponse/get
 * and VacationResponse/set) and implements the account capability checks described in
 * RFC 8621 Section 1.3.3.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-1.3.3 | RFC 8621 Section 1.3.3: The VacationResponse Capability}
 */
export const vacationResponseAccountSupportPlugin: ValidationPlugin<"invocation"> = {
    name: "vacationresponse-account-support",
    hook: "invocation",
    trigger: {
        capabilityUri: VACATIONRESPONSE_CAPABILITY_URI,
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
        if (!account.accountCapabilities[VACATIONRESPONSE_CAPABILITY_URI]) {
            return {
                valid: false,
                errors: [new Error(`Account "${accountId}" does not support the VacationResponse capability.`)],
            };
        }

        return { valid: true };
    },
};

/**
 * Defines the VacationResponse capability, including the VacationResponse invocations and
 * validation plugins.
 *
 * Per RFC 8621 Section 1.3.3, the `urn:ietf:params:jmap:vacationresponse` capability represents
 * support for the VacationResponse data type and associated API methods.
 *
 * Read-only account protection for VacationResponse/set is handled by Core's generic
 * `preventSetOnReadOnlyAccountPlugin`.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-1.3.3 | RFC 8621 Section 1.3.3: The VacationResponse Capability}
 */
export const VacationResponseCapability = {
    uri: VACATIONRESPONSE_CAPABILITY_URI,
    invocations: {
        VacationResponse,
    },
    validators: [vacationResponseAccountSupportPlugin],
} satisfies CapabilityDefinition;

declare module "../common/types.js" {
    interface ServerCapabilityRegistry {
        [VACATIONRESPONSE_CAPABILITY_URI]?: EmptyObject;
    }
    interface AccountCapabilityRegistry {
        [VACATIONRESPONSE_CAPABILITY_URI]?: EmptyObject;
    }
}
