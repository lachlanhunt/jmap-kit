import type { ValidationPlugin, ValidationPluginTrigger } from "../../capability-registry/types.js";
import type { Id } from "../../common/types.js";
import type { BaseInvocationArgs } from "../../invocation/types.js";
import { assertInvocationDataType } from "./assert-invocation-datatype.js";
import { assertInvocationMethod } from "./assert-invocation-method.js";
import { assertInvocation } from "./assert-invocation.js";

/**
 * Factory function to create read-only account validation plugins.
 *
 * This factory reduces code duplication by centralising the common pattern of validating
 * that an account is not read-only before allowing write operations.
 *
 * The factory automatically asserts the invocation type based on the trigger configuration:
 * - If both `dataType` and `method` are specified, uses `assertInvocation()`
 * - If only `method` is specified, uses `assertInvocationMethod()`
 * - If only `dataType` is specified, uses `assertInvocationDataType()`
 *
 * @param config - Configuration for the validator
 * @param config.name - Unique name for the validation plugin
 * @param config.trigger - Trigger conditions defining when the validator runs
 *
 * @returns A ValidationPlugin that checks if the account is read-only
 *
 * @example
 * ```typescript
 * // For a specific method call like Blob/upload
 * const validator = createReadOnlyAccountValidator({
 *   name: "blob-prevent-upload-on-readonly-account",
 *   trigger: { dataType: "Blob", method: "upload" },
 * });
 *
 * // For all methods of a data type
 * const validator = createReadOnlyAccountValidator({
 *   name: "example-prevent-write-on-readonly",
 *   trigger: { dataType: "Example" },
 * });
 *
 * // For a specific method across data types
 * const validator = createReadOnlyAccountValidator({
 *   name: "prevent-set-on-readonly",
 *   trigger: { method: "set" },
 * });
 * ```
 */
export function createReadOnlyAccountValidator<
    TArgs extends BaseInvocationArgs & { accountId: Id } = BaseInvocationArgs & { accountId: Id },
>(config: { name: string; trigger: ValidationPluginTrigger<"invocation"> }): ValidationPlugin<"invocation", TArgs> {
    return {
        name: config.name,
        hook: "invocation",
        trigger: config.trigger,
        validate(context) {
            const { invocation, accounts } = context;

            // Assert invocation type based on trigger configuration
            if (config.trigger.dataType && config.trigger.method) {
                assertInvocation(invocation, config.trigger.dataType, config.trigger.method);
            } else if (config.trigger.method) {
                assertInvocationMethod(invocation, config.trigger.method);
            } else if (config.trigger.dataType) {
                assertInvocationDataType(invocation, config.trigger.dataType);
            } else {
                throw new Error(
                    `Read-only account validator "${config.name}" must have at least a dataType or method trigger`,
                );
            }

            const accountId = invocation.getArgument("accountId");
            const account = accountId in accounts ? accounts[accountId] : undefined;
            if (!account) {
                return {
                    valid: false,
                    errors: [new Error(`Account "${accountId}" does not exist.`)],
                };
            }

            if (account.isReadOnly) {
                return {
                    valid: false,
                    errors: [new Error(`Account "${accountId}" is read-only`)],
                };
            }

            return { valid: true };
        },
    };
}
