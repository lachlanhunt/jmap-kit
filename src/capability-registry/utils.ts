import type {
    BasePluginContext,
    PluginContext,
    PluginData,
    PluginTrigger,
    TransformationPlugin,
    ValidationPlugin,
    ValidationPluginContext,
    ValidationPluginTrigger,
    ValidationResult,
} from "./types.js";

/**
 * Type guard to check if a trigger has a required capability URI
 *
 * @param trigger The plugin trigger to check
 * @returns True if the trigger has a valid required capability URI string
 */
export function hasRequiredCapabilityUri(trigger: PluginTrigger): trigger is Required<PluginTrigger> {
    return "requiredCapabilityUri" in trigger && typeof trigger.requiredCapabilityUri === "string";
}

/**
 * Determines if an invocation hook should run based on trigger conditions
 *
 * @param trigger The validation plugin trigger with optional capability URI, data type, and method filters
 * @param context The validation plugin context containing the invocation to match against
 * @returns True if the trigger matches the invocation (omitted trigger properties match any value)
 */
export function shouldRunInvocationHook(
    trigger: ValidationPluginTrigger<"invocation">,
    context: ValidationPluginContext<"invocation">,
): boolean {
    const { invocation } = context;
    return (
        (trigger.capabilityUri ?? invocation.uri) === invocation.uri &&
        (trigger.dataType ?? invocation.dataType) === invocation.dataType &&
        (trigger.method ?? invocation.method) === invocation.method
    );
}

/**
 * Determines if a lifecycle hook should run based on server capability requirements
 *
 * @param trigger The plugin trigger that may specify a required capability URI
 * @param context The base plugin context containing server capabilities
 * @returns True if the trigger should run
 */
export function shouldRunLifecycleHook(trigger: PluginTrigger, context: BasePluginContext): boolean {
    if (hasRequiredCapabilityUri(trigger)) {
        return Object.hasOwn(context.serverCapabilities, trigger.requiredCapabilityUri);
    }
    return true;
}

/**
 * Validates an invocation against registered validators
 *
 * @param context The validation plugin context containing the invocation to validate and execution context
 * @param validators The array of validators to execute
 * @returns Promise resolving to validation result with any errors found
 */
export async function validateInvocation(
    context: ValidationPluginContext<"invocation">,
    validators: ValidationPlugin<"invocation">[],
): Promise<ValidationResult> {
    // Create validation promises for all applicable validators
    const validationPromises = validators
        .filter((validator) => shouldRunInvocationHook(validator.trigger, context))
        .map<Promise<ValidationResult>>(async (validator) => {
            try {
                return await validator.validate(context);
            } catch (error) {
                const errorMessage = `Validator '${validator.name}' failed`;
                return { valid: false, errors: [new Error(errorMessage, { cause: error })] };
            }
        });

    // Run all validations concurrently
    const settledResults = await Promise.all(validationPromises);

    const errors = settledResults.flatMap((settledResult) => settledResult.errors ?? []);

    const valid = errors.length === 0;

    return valid ? { valid } : { valid, errors };
}

/**
 * Validates a request against the specified lifecycle hook validators
 *
 * @param hook The lifecycle hook to validate for
 * @param context The validation plugin context containing the data to validate and execution context
 * @param validators The array of validators to execute
 * @returns Promise resolving to validation result with any errors found
 */
export async function validateLifecycleHook<THook extends "pre-build" | "pre-serialization">(
    hook: THook,
    context: ValidationPluginContext<THook>,
    validators: ValidationPlugin<THook>[],
): Promise<ValidationResult> {
    // Create validation promises for all applicable validators
    const validationPromises = validators
        .filter((validator) => shouldRunLifecycleHook(validator.trigger, context))
        .map<Promise<ValidationResult>>(async (validator) => {
            try {
                return await validator.validate(context);
            } catch (error) {
                const errorMessage = `${hook} validator '${validator.name}' failed`;
                return { valid: false, errors: [new Error(errorMessage, { cause: error })] };
            }
        });

    // Run all validations concurrently
    const settledResults = await Promise.all(validationPromises);

    const errors = settledResults.flatMap((settledResult) => settledResult.errors ?? []);

    const valid = errors.length === 0;

    return valid ? { valid } : { valid, errors };
}

/**
 * Validates the serialised request body against registered post-serialization validators
 *
 * @param context The validation plugin context containing the serialised data and execution context
 * @param validators The array of validators to execute
 * @returns Promise resolving to validation result with any errors found
 */
export async function validateSerialization(
    context: ValidationPluginContext<"post-serialization">,
    validators: ValidationPlugin<"post-serialization">[],
): Promise<ValidationResult> {
    // Create validation promises for all applicable validators
    const validationPromises = validators
        .filter((validator) => shouldRunLifecycleHook(validator.trigger, context))
        .map<Promise<ValidationResult>>(async (validator) => {
            try {
                return await validator.validate(context);
            } catch (error) {
                const errorMessage = `post-serialization validator '${validator.name}' failed`;
                return { valid: false, errors: [new Error(errorMessage, { cause: error })] };
            }
        });

    // Run all validations concurrently
    const settledResults = await Promise.all(validationPromises);

    const errors = settledResults.flatMap((settledResult) => settledResult.errors ?? []);

    const valid = errors.length === 0;

    return valid ? { valid } : { valid, errors };
}

/**
 * Transforms a request using transformers for the pre-serialization hook
 *
 * @param context The plugin context containing the data to transform and execution context
 * @param transformers The array of transformers to execute
 * @returns The transformed PluginData after all transformers have run
 */
export async function transformBuild(
    context: PluginContext<"pre-serialization">,
    transformers: TransformationPlugin<"pre-serialization">[],
): Promise<PluginData<"pre-serialization">> {
    let currentContext = context;
    for (const transformer of transformers) {
        const { transform, trigger } = transformer;

        if (shouldRunLifecycleHook(trigger, currentContext)) {
            const data = await transform(currentContext);
            currentContext = {
                ...currentContext,
                data,
            };
        }
    }
    return currentContext.data;
}

/**
 * Transforms a serialised request using the post-serialization transformers
 *
 * @remarks
 * This function is structurally identical to {@link transformBuild} but has different
 * type parameters. TypeScript's handling of conditional types makes it difficult to create
 * a single function that handles both cases with proper type safety.
 *
 * @param context The plugin context containing the data to transform and execution context
 * @param transformers The array of transformers to execute
 * @returns The transformed PluginData after all transformers have run
 */
export async function transformSerialization( // NOSONAR:S4144 Identical implementation is required due to TypeScript type system limitations
    context: PluginContext<"post-serialization">,
    transformers: TransformationPlugin<"post-serialization">[],
): Promise<PluginData<"post-serialization">> {
    let currentContext = context;
    for (const transformer of transformers) {
        const { transform, trigger } = transformer;

        if (shouldRunLifecycleHook(trigger, currentContext)) {
            const data = await transform(currentContext);
            currentContext = {
                ...currentContext,
                data,
            };
        }
    }
    return currentContext.data;
}
