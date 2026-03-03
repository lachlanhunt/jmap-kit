import type { StandardSchemaV1 } from "@standard-schema/spec";
import { CORE_CAPABILITY_URI } from "../common/registry.js";
import type { JMAPCapability, JMAPDataType, JMAPMethodName } from "../common/types.js";
import type { GenericInvocationFactory, InvocationFactoryCollection } from "../invocation/types.js";
import type { ClientContext, Logger } from "../jmap-client/types.js";
import type {
    AccountCapabilityValidationResult,
    CapabilityDefinition,
    CapabilityRegistryInterface,
    InvocationFactoryMap,
    PluginData,
    PluginLifecycleHook,
    ServerCapabilityValidationResult,
    TransformationPlugin,
    TransformationPluginMap,
    TransformerExecutionContext,
    ValidationPlugin,
    ValidationPluginLifecycleHook,
    ValidationPluginMap,
    ValidationResult,
    ValidatorExecutionContext,
} from "./types.js";
import {
    transformBuild,
    transformSerialization,
    validateInvocation,
    validateLifecycleHook,
    validateSerialization,
} from "./utils.js";

/**
 * Registry for managing JMAP capabilities
 *
 * The registry stores capability definitions and provides methods to register,
 * unregister, and query capabilities.
 * The Core capability is always registered and cannot be unregistered.
 */
export class CapabilityRegistry implements CapabilityRegistryInterface {
    readonly #capabilities = new Map<JMAPCapability, CapabilityDefinition>();
    readonly #logger: Logger;

    readonly #validationPlugins: ValidationPluginMap = {
        invocation: new Set(),
        "pre-build": new Set(),
        "pre-serialization": new Set(),
        "post-serialization": new Set(),
    };

    readonly #transformationPlugins: TransformationPluginMap = {
        "pre-serialization": new Set(),
        "post-serialization": new Set(),
    };

    readonly #invocationFactories: InvocationFactoryMap = new Map();

    /**
     * Creates a new CapabilityRegistry
     *
     * @param coreCapability The Core capability definition that will always be registered
     * @param options Integration options including logger
     */
    constructor(coreCapability: CapabilityDefinition, { logger }: ClientContext) {
        if (coreCapability.uri !== CORE_CAPABILITY_URI) {
            throw new Error(`Core capability URI mismatch: expected ${CORE_CAPABILITY_URI}, got ${coreCapability.uri}`);
        }

        this.#logger = logger;
        this.#capabilities.set(CORE_CAPABILITY_URI, coreCapability);
        this.#initializePluginMaps(coreCapability);
    }

    /**
     * Initialise the plugin arrays with plugins from a capability
     *
     * @param capability The capability definition to add plugins from
     */
    #initializePluginMaps(capability: CapabilityDefinition): void {
        this.#addValidatorsFromCapability(capability);
        this.#addTransformersFromCapability(capability);
        this.#addInvocationFactoriesFromCapability(capability);
    }

    /**
     * Add validators from a capability to the validators arrays
     *
     * @param capability The capability definition to add validators from
     */
    #addValidatorsFromCapability(capability: CapabilityDefinition): void {
        const validators = capability.validators ?? [];

        // Sort validators by hook
        for (const validator of validators) {
            switch (validator.hook) {
                case "pre-build": {
                    this.#logger.debug(`Adding pre-build validator: ${validator.name}`);
                    this.#validationPlugins["pre-build"].add(validator);
                    break;
                }
                case "pre-serialization": {
                    this.#logger.debug(`Adding pre-serialization validator: ${validator.name}`);
                    this.#validationPlugins["pre-serialization"].add(validator);
                    break;
                }
                case "post-serialization": {
                    this.#logger.debug(`Adding post-serialization validator: ${validator.name}`);
                    this.#validationPlugins["post-serialization"].add(validator);
                    break;
                }
                case "invocation": {
                    this.#logger.debug(`Adding invocation validator: ${validator.name}`);
                    this.#validationPlugins.invocation.add(validator);
                    break;
                }
            }
        }
    }

    /**
     * Add transformers from a capability to the transformers arrays
     *
     * @param capability The capability definition to add transformers from
     */
    #addTransformersFromCapability(capability: CapabilityDefinition): void {
        const transformers = capability.transformers ?? [];

        // Sort transformers by hook
        for (const transformer of transformers) {
            if (transformer.hook === "pre-serialization") {
                this.#transformationPlugins["pre-serialization"].add(transformer);
            } else {
                this.#transformationPlugins["post-serialization"].add(transformer);
            }
        }
    }

    /**
     * Add invocation factories from a capability to the invocation factory map
     *
     * This handles the special case where Blob data type methods can come from multiple capabilities.
     * The Core capability includes Blob/copy, but other Blob methods may come from a separate
     * Blob capability with a different URI.
     *
     * @param capability The capability definition to add invocation factories from
     */
    #addInvocationFactoriesFromCapability(capability: CapabilityDefinition): void {
        for (const [dataType, factoryCollection] of Object.entries(capability.invocations)) {
            if (!factoryCollection) continue;

            const typedDataType = dataType as JMAPDataType;
            const existingCollection = this.#invocationFactories.get(typedDataType);

            if (existingCollection) {
                // Merge with existing collection (for cases like Blob methods from multiple capabilities)
                this.#logger.debug(`Merging invocation factories for data type: ${dataType}`);

                // Merge request factories
                Object.assign(existingCollection.request, factoryCollection.request);

                // Merge response factories
                Object.assign(existingCollection.response, factoryCollection.response);
            } else {
                // Add new collection (create shallow copy to maintain immutability)
                this.#logger.debug(`Adding invocation factory collection for data type: ${dataType}`);
                const collectionCopy: InvocationFactoryCollection = {
                    request: { ...factoryCollection.request },
                    response: { ...factoryCollection.response },
                };
                this.#invocationFactories.set(typedDataType, collectionCopy);
            }
        }
    }

    /**
     * Register a capability with the registry
     *
     * @param capability The capability definition to register
     * @returns true if the capability was registered, false if it was already registered
     */
    register(capability: CapabilityDefinition): boolean {
        if (this.#capabilities.has(capability.uri)) {
            return false;
        }

        this.#capabilities.set(capability.uri, capability);
        this.#initializePluginMaps(capability);
        return true;
    }

    /**
     * Check if a capability is registered
     *
     * @param uri The URI of the capability to check
     * @returns true if the capability is registered, false otherwise
     */
    has(uri: JMAPCapability): boolean {
        return this.#capabilities.has(uri);
    }

    /**
     * Get a registered capability by URI
     *
     * @param uri The URI of the capability to get
     * @returns The capability definition, or undefined if not registered
     */
    get(uri: JMAPCapability): CapabilityDefinition | undefined {
        return this.#capabilities.get(uri);
    }

    /**
     * Get all registered capabilities
     *
     * @returns An array of all registered capability definitions
     */
    getAll(): CapabilityDefinition[] {
        return Array.from(this.#capabilities.values());
    }

    /**
     * Get all registered validation plugins for a specific hook
     *
     * @param hook The lifecycle hook to get validators for
     * @returns An array of validation plugins for the specified hook
     */
    getValidatorsByHook<THook extends ValidationPluginLifecycleHook>(hook: THook): ValidationPlugin<THook>[] {
        return Array.from(this.#validationPlugins[hook]);
    }

    /**
     * Get all registered transformation plugins for a specific hook
     *
     * @param hook The lifecycle hook to get transformers for
     * @returns An array of transformation plugins for the specified hook
     */
    getTransformersByHook<THook extends Exclude<PluginLifecycleHook, "pre-build">>(
        hook: THook,
    ): TransformationPlugin<THook>[] {
        return Array.from(this.#transformationPlugins[hook]);
    }

    /**
     * Execute validators for the specified hook type
     *
     * Validates the provided context data against all registered validation plugins
     * for the specified hook type.
     *
     * @param execution The validation execution context containing hook type and context data
     * @returns A ValidationResult indicating whether the validation was successful or failed with errors
     */
    executeValidators<THook extends ValidationPluginLifecycleHook>({
        hook,
        context,
    }: ValidatorExecutionContext<THook>): Promise<ValidationResult> {
        // Check which hook type we're dealing with and call the appropriate method
        if (hook === "invocation") {
            const validators = this.getValidatorsByHook(hook);
            return validateInvocation(context, validators);
        } else if (hook === "post-serialization") {
            const validators = this.getValidatorsByHook(hook);
            return validateSerialization(context, validators);
        } else {
            // For pre-build and pre-serialization hooks
            const validators = this.getValidatorsByHook(hook);
            return validateLifecycleHook(hook, context, validators);
        }
    }

    /**
     * Execute transformers for the pre-serialization hook
     *
     * @param options The transformer execution context containing hook type and context data
     * @param options.hook The lifecycle hook to execute transformers for
     * @param options.context The context data to transform
     * @returns A Promise resolving to the transformed data
     */
    executeBuildTransformers({
        hook = "pre-serialization",
        context,
    }: TransformerExecutionContext<"pre-serialization">): Promise<PluginData<"pre-serialization">> {
        const transformers = this.getTransformersByHook(hook);
        return transformBuild(context, transformers);
    }

    /**
     * Execute transformers for the post-serialization hook
     *
     * @param options The transformer execution context containing hook type and context data
     * @param options.hook The lifecycle hook to execute transformers for
     * @param options.context The context data to transform
     * @returns A Promise resolving to the transformed data
     */
    executeSerializationTransformers({
        hook = "post-serialization",
        context,
    }: TransformerExecutionContext<"post-serialization">): Promise<PluginData<"post-serialization">> {
        const transformers = this.getTransformersByHook(hook);
        return transformSerialization(context, transformers);
    }

    /**
     * Get the invocation factory collection for a specific data type
     *
     * @param dataType The JMAP data type to get factories for
     * @returns The invocation factory collection for the data type, or undefined if not registered
     */
    getInvocationFactoryByDataType(dataType: JMAPDataType): InvocationFactoryCollection | undefined {
        return this.#invocationFactories.get(dataType);
    }

    /**
     * Get a specific invocation request factory by data type and method name
     *
     * @param dataType The JMAP data type
     * @param methodName The JMAP method name
     * @returns The invocation request factory function, or undefined if not found
     */
    getInvocationRequestFactory(
        dataType: JMAPDataType,
        methodName: JMAPMethodName,
    ): GenericInvocationFactory | undefined {
        const collection = this.#invocationFactories.get(dataType);
        if (!collection) {
            return undefined;
        }

        return collection.request[methodName];
    }

    /**
     * Get a specific invocation response factory by data type and method name
     *
     * @param dataType The JMAP data type
     * @param methodName The JMAP method name
     * @returns The invocation response factory function, or undefined if not found
     */
    getInvocationResponseFactory(
        dataType: JMAPDataType,
        methodName: JMAPMethodName,
    ): GenericInvocationFactory | undefined {
        const collection = this.#invocationFactories.get(dataType);
        if (!collection) {
            return undefined;
        }

        return collection.response[methodName];
    }

    /**
     * Validate server capability data against registered capability schemas.
     *
     * @param capabilities The server capabilities object from the parsed JMAP session
     * @returns An array of validation failures (empty if all capabilities are valid)
     */
    async validateServerCapabilities(
        capabilities: Record<string, unknown>,
    ): Promise<ServerCapabilityValidationResult[]> {
        const pending: Promise<ServerCapabilityValidationResult>[] = [];

        for (const { uri, schema } of this.#capabilities.values()) {
            if (!schema?.serverCapability || !(uri in capabilities)) continue;

            pending.push(
                CapabilityRegistry.#validateWithStandardSchema(schema.serverCapability, capabilities[uri]).then(
                    (result) => ({ ...result, uri }),
                ),
            );
        }

        return Promise.all(pending);
    }

    /**
     * Validate account capability data against registered capability schemas.
     *
     * @param accounts The accounts object from the parsed JMAP session
     * @returns An array of validation failures (empty if all account capabilities are valid)
     */
    async validateAccountCapabilities(
        accounts: Record<string, { accountCapabilities: Record<string, unknown> }>,
    ): Promise<AccountCapabilityValidationResult[]> {
        const pending: Promise<AccountCapabilityValidationResult>[] = [];

        for (const { uri, schema } of this.#capabilities.values()) {
            if (!schema?.accountCapability) continue;

            for (const [accountId, account] of Object.entries(accounts)) {
                if (!(uri in account.accountCapabilities)) continue;

                pending.push(
                    CapabilityRegistry.#validateWithStandardSchema(
                        schema.accountCapability,
                        account.accountCapabilities[uri],
                    ).then((result) => ({ ...result, uri, accountId })),
                );
            }
        }

        return Promise.all(pending);
    }

    /**
     * Validate a single capability definition's schemas against session data
     * without requiring the capability to be registered.
     *
     * @param capability The capability definition to validate
     * @param serverCapabilities The server capabilities from the session
     * @param accounts The accounts from the session
     * @returns An object containing arrays of server and account capability validation failures
     */
    async validateCapabilityDefinition(
        capability: CapabilityDefinition,
        serverCapabilities: Record<string, unknown>,
        accounts: Record<string, { accountCapabilities: Record<string, unknown> }>,
    ): Promise<{
        serverCapabilities: Extract<ServerCapabilityValidationResult, { valid: false }>[];
        accountCapabilities: Extract<AccountCapabilityValidationResult, { valid: false }>[];
    }> {
        const serverFailures: Extract<ServerCapabilityValidationResult, { valid: false }>[] = [];
        const accountFailures: Extract<AccountCapabilityValidationResult, { valid: false }>[] = [];

        const { uri, schema } = capability;

        // Validate server capability schema
        if (schema?.serverCapability && uri in serverCapabilities) {
            const result = await CapabilityRegistry.#validateWithStandardSchema(
                schema.serverCapability,
                serverCapabilities[uri],
            );
            if (!result.valid) {
                serverFailures.push({ ...result, uri });
            }
        }

        // Validate account capability schema
        if (schema?.accountCapability) {
            for (const [accountId, account] of Object.entries(accounts)) {
                if (!(uri in account.accountCapabilities)) continue;

                const result = await CapabilityRegistry.#validateWithStandardSchema(
                    schema.accountCapability,
                    account.accountCapabilities[uri],
                );
                if (!result.valid) {
                    accountFailures.push({ ...result, uri, accountId });
                }
            }
        }

        return { serverCapabilities: serverFailures, accountCapabilities: accountFailures };
    }

    /**
     * Validate a value against a StandardSchema and return a ValidationResult.
     */
    static async #validateWithStandardSchema(schema: StandardSchemaV1, value: unknown): Promise<ValidationResult> {
        const result = await schema["~standard"].validate(value);
        if (result.issues) {
            return {
                valid: false,
                errors: result.issues.map((issue) => {
                    const path = issue.path?.map((p) => (typeof p === "object" ? p.key : p)).join(".") ?? "";
                    return new Error(path ? `${path}: ${issue.message}` : issue.message);
                }),
            };
        }
        return { valid: true };
    }
}
