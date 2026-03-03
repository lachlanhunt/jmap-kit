import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
    Id,
    JMAPCapability,
    JMAPDataType,
    JMAPMethodName,
    JMAPRequest,
    JMAPServerCapabilities,
    MaybePromise,
} from "../common/types.js";
import type { Invocation } from "../invocation/invocation.js";
import type { BaseInvocationArgs, GenericInvocationFactory, InvocationFactoryCollection } from "../invocation/types.js";
import type { JMAPAccount } from "../jmap-client/types.js";

/**
 * Represents the result of a validation operation from a validation plugin.
 * Used by the ValidationPlugin.validate() method to indicate whether validation
 * was successful or failed with specific errors.
 */
export type ValidationResult =
    | {
          valid: true;
          errors?: never;
      }
    | {
          valid: false;
          errors: Error[];
      };

/**
 * Validation plugin lifecycle hooks
 *
 * The "invocation" hook also exists for Validation plugins
 */
export type PluginLifecycleHook =
    | "pre-build" // Before the JMAP request is constructed
    | "pre-serialization" // Before the JMAP request is serialised to JSON
    | "post-serialization"; // After the JMAP request is serialised to JSON

/**
 * Validation plugin lifecycle hooks, including the additional "invocation" hook for validation plugins
 */
export type ValidationPluginLifecycleHook = PluginLifecycleHook | "invocation"; // For validation plugins that run on specific invocations

/**
 * Base context provided to all plugins, regardless of lifecycle hook
 */
export type BasePluginContext = {
    /** The server capabilities. */
    serverCapabilities: Readonly<JMAPServerCapabilities>;

    /** The account ID associated with the invocation. */
    accounts: Readonly<Record<Id, JMAPAccount>>;
};

/**
 * Data provided to plugins based on lifecycle hook
 */
export type PluginData<THook extends PluginLifecycleHook> = THook extends "post-serialization"
    ? {
          /**
           * The serialised JMAP request body.
           *
           * Validators will only receive the serialised JSON as a string.
           * Transformation plugins will receive the data in any format,
           * as it may have been transformed by previous plugins.
           */
          body: string | Blob | ArrayBuffer | File;

          /**
           * HTTP headers for the request.
           *
           * This will initially contain Content-Type: application/json,
           * but may be modified by transformation plugins.
           *
           * Transformation plugins should ensure the server is capable
           * of handling any headers they add or modify.
           */
          headers: Headers;
      }
    : JMAPRequest;

/**
 * Context provided to validation plugins
 */
export type PluginContext<THook extends PluginLifecycleHook> = BasePluginContext & {
    data: PluginData<THook>;
};

/**
 * The context provided for the execution of validation plugins, for each of the lifecycle hooks
 */
export type ValidatorExecutionContext<THook extends ValidationPluginLifecycleHook> = THook extends "invocation"
    ? {
          hook: "invocation";
          context: ValidationPluginContext<THook>;
      }
    : THook extends "pre-build" | "pre-serialization"
      ? {
            hook: THook;
            context: ValidationPluginContext<THook>;
        }
      : THook extends "post-serialization"
        ? { hook: "post-serialization"; context: ValidationPluginContext<THook> }
        : never;

/**
 * The context provided for the execution of transformation plugins, for each of the lifecycle hooks
 */
export type TransformerExecutionContext<THook extends Exclude<PluginLifecycleHook, "pre-build">> =
    THook extends "pre-serialization"
        ? {
              hook?: "pre-serialization";
              context: PluginContext<"pre-serialization">;
          }
        : { hook?: "post-serialization"; context: PluginContext<"post-serialization"> };

/**
 * The context passed to the validate() method of validation plugins.
 */
export type ValidationPluginContext<
    THook extends ValidationPluginLifecycleHook = ValidationPluginLifecycleHook,
    TArgs extends BaseInvocationArgs = BaseInvocationArgs,
> = THook extends PluginLifecycleHook
    ? PluginContext<THook>
    : BasePluginContext & {
          /** Current invocation being processed */
          invocation: Invocation<TArgs>;
      };

/**
 * Validation plugin trigger conditions
 */
export type ValidationPluginTrigger<THook extends ValidationPluginLifecycleHook = ValidationPluginLifecycleHook> =
    THook extends "invocation"
        ? {
              /**
               * The capability URI of the invocation being processed.
               *
               * This differs from `requiredCapabilityUri` in that it is the capability
               * URI of the specific invocation, rather than a general support requirement.
               */
              capabilityUri?: JMAPCapability;

              /** The data type of the invocation being processed. */
              dataType?: JMAPDataType;

              /** The method name of the invocation being processed. */
              method?: JMAPMethodName;
          }
        : PluginTrigger;

/**
 * Validation plugin interface as a discriminated union based on hook type
 */
export type ValidationPlugin<
    THook extends ValidationPluginLifecycleHook,
    TArgs extends BaseInvocationArgs = BaseInvocationArgs,
> = THook extends "invocation"
    ? {
          /** Plugin identifier */
          name: string;

          /** Discriminant property */
          hook: THook;

          /** Defines when this plugin should run */
          trigger: ValidationPluginTrigger<THook>;

          /** Execute the validation logic */
          validate(this: void, context: ValidationPluginContext<THook, TArgs>): MaybePromise<ValidationResult>;
      }
    : THook extends "pre-build" | "pre-serialization"
      ? {
            name: string;
            hook: THook;
            trigger: ValidationPluginTrigger<THook>;
            validate(this: void, context: ValidationPluginContext<THook>): MaybePromise<ValidationResult>;
        }
      : {
            name: string;
            hook: THook;
            trigger: ValidationPluginTrigger<THook>;
            validate(this: void, context: ValidationPluginContext<THook>): MaybePromise<ValidationResult>;
        };

/**
 * Transformation plugin trigger conditions
 */
export type PluginTrigger = {
    requiredCapabilityUri?: JMAPCapability;
};

/** Transformation plugin interface */
export type TransformationPlugin<THook extends Exclude<PluginLifecycleHook, "pre-build">> =
    THook extends "pre-serialization"
        ? {
              /** Plugin identifier */
              name: string;

              /** Discriminant property */
              hook: THook;

              /** Defines when this plugin should run */
              trigger: PluginTrigger;

              /**
               * Execute the transformation logic
               *
               * Can be implemented as either synchronous or asynchronous
               */
              transform(this: void, context: PluginContext<THook>): MaybePromise<PluginData<THook>>;
          }
        : {
              name: string;
              hook: THook;
              trigger: PluginTrigger;
              transform(this: void, context: PluginContext<THook>): MaybePromise<PluginData<THook>>;
          };

/**
 * Capability definition with plugins
 */
export type CapabilityDefinition = {
    /**
     * The capability URI
     */
    uri: JMAPCapability;

    /**
     * The invocation factories organised by invocation type
     */
    invocations: Partial<Record<JMAPDataType, InvocationFactoryCollection>>;

    /**
     * Validation plugins for this capability
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators?: ValidationPlugin<ValidationPluginLifecycleHook, any>[];

    /**
     * Transformation plugins for this capability
     */
    transformers?: TransformationPlugin<Exclude<PluginLifecycleHook, "pre-build">>[];

    /**
     * StandardSchema validators for this capability's session data.
     *
     * These schemas validate the capability's slice of the JMAP session object
     * during connection. Any validation library that implements the StandardSchema
     * interface can be used, keeping this library decoupled from a specific
     * validation library.
     *
     * @see {@link https://github.com/standard-schema/standard-schema StandardSchema specification}
     */
    schema?: {
        /** Schema for `session.capabilities[uri]` */
        serverCapability?: StandardSchemaV1;
        /** Schema for `account.accountCapabilities[uri]` */
        accountCapability?: StandardSchemaV1;
    };
};

/**
 * The result of validating a server capability's session data against its schema.
 */
export type ServerCapabilityValidationResult = ValidationResult & {
    /** The capability URI that was validated */
    uri: JMAPCapability;
};

/**
 * The result of validating an account capability's session data against its schema.
 */
export type AccountCapabilityValidationResult = ValidationResult & {
    /** The capability URI that was validated */
    uri: JMAPCapability;
    /** The account ID where the validation was performed */
    accountId: string;
};

/**
 * Map of validation plugins organised by lifecycle hook
 */
export type ValidationPluginMap = {
    [K in ValidationPluginLifecycleHook]: Set<ValidationPlugin<K>>;
};

/**
 * Map of transformation plugins organised by lifecycle hook
 */
export type TransformationPluginMap = {
    [K in Exclude<PluginLifecycleHook, "pre-build">]: Set<TransformationPlugin<K>>;
};

/**
 * Map of invocation factory collections organised by data type
 */
export type InvocationFactoryMap = Map<JMAPDataType, InvocationFactoryCollection>;

/**
 * Public interface for the JMAP Capability Registry
 *
 * This interface defines all the public methods and properties that a capability registry should provide.
 */
export interface CapabilityRegistryInterface {
    /**
     * Register a capability with the registry
     *
     * @param capability The capability definition to register
     * @returns true if the capability was registered, false if it was already registered
     */
    register(capability: CapabilityDefinition): boolean;

    /**
     * Check if a capability is registered
     *
     * @param uri The URI of the capability to check
     * @returns true if the capability is registered, false otherwise
     */
    has(uri: JMAPCapability): boolean;

    /**
     * Get a registered capability by URI
     *
     * @param uri The URI of the capability to get
     * @returns The capability definition, or undefined if not registered
     */
    get(uri: JMAPCapability): CapabilityDefinition | undefined;

    /**
     * Get all registered capabilities
     *
     * @returns An array of all registered capability definitions
     */
    getAll(): CapabilityDefinition[];

    /**
     * Get all registered validation plugins for a specific hook
     *
     * @param hook The lifecycle hook to get validators for
     * @returns An array of validation plugins for the specified hook
     */
    getValidatorsByHook<THook extends ValidationPluginLifecycleHook>(hook: THook): ValidationPlugin<THook>[];

    /**
     * Get all registered transformation plugins for a specific hook
     *
     * @param hook The lifecycle hook to get transformers for
     * @returns An array of transformation plugins for the specified hook
     */
    getTransformersByHook<THook extends Exclude<PluginLifecycleHook, "pre-build">>(
        hook: THook,
    ): TransformationPlugin<THook>[];

    /**
     * Get the invocation factory collection for a specific data type
     *
     * @param dataType The JMAP data type to get factories for
     * @returns The invocation factory collection for the data type, or undefined if not registered
     */
    getInvocationFactoryByDataType(dataType: JMAPDataType): InvocationFactoryCollection | undefined;

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
    ): GenericInvocationFactory | undefined;

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
    ): GenericInvocationFactory | undefined;

    /**
     * Execute validators for the specified hook type
     *
     * Validates the provided context data against all registered validation plugins
     * for the specified hook type.
     *
     * @param execution The validation execution context containing hook type and context data
     * @returns A ValidationResult indicating whether the validation was successful or failed with errors
     */
    executeValidators<THook extends ValidationPluginLifecycleHook>(
        execution: ValidatorExecutionContext<THook>,
    ): Promise<ValidationResult>;

    /**
     * Execute build transformers for the pre-serialization hook type
     *
     * Transforms the provided context data using all registered transformation plugins
     * for the pre-serialization hook type.
     *
     * @param execution The transformation execution context containing hook type and context data
     * @returns The transformed plugin data
     */
    executeBuildTransformers(
        execution: TransformerExecutionContext<"pre-serialization">,
    ): Promise<PluginData<"pre-serialization">>;

    /**
     * Execute serialisation transformers for the post-serialization hook type
     *
     * Transforms the provided context data using all registered transformation plugins
     * for the post-serialization hook type.
     *
     * @param execution The transformation execution context containing hook type and context data
     * @returns The transformed plugin data
     */
    executeSerializationTransformers(
        execution: TransformerExecutionContext<"post-serialization">,
    ): Promise<PluginData<"post-serialization">>;

    /**
     * Validate server capability data against registered capability schemas.
     *
     * For each registered capability with a `schema.serverCapability`, validates the
     * corresponding entry in `capabilities` using the StandardSchema
     * `~standard.validate()` protocol.
     *
     * This is a pure validation function — it does not mutate the input or emit
     * events. The caller is responsible for filtering invalid capabilities from the
     * session and emitting appropriate events.
     *
     * @param capabilities The server capabilities object from the parsed JMAP session
     * @returns An array of validation results for each registered capability present in the input
     */
    validateServerCapabilities(capabilities: Record<string, unknown>): Promise<ServerCapabilityValidationResult[]>;

    /**
     * Validate account capability data against registered capability schemas.
     *
     * For each registered capability with a `schema.accountCapability`, validates the
     * corresponding entry in each account's `accountCapabilities` using the
     * StandardSchema `~standard.validate()` protocol.
     *
     * This is a pure validation function — it does not mutate the input or emit
     * events. The caller is responsible for filtering invalid capabilities from the
     * session and emitting appropriate events.
     *
     * @param accounts The accounts object from the parsed JMAP session
     * @returns An array of validation results for each registered capability present per account
     */
    validateAccountCapabilities(
        accounts: Record<string, { accountCapabilities: Record<string, unknown> }>,
    ): Promise<AccountCapabilityValidationResult[]>;

    /**
     * Validate a single capability definition's schemas against session data
     * without requiring the capability to be registered.
     *
     * This is a pure validation function — it does not mutate the input, register
     * the capability, or emit events. The caller is responsible for acting on
     * the validation results.
     *
     * @param capability The capability definition to validate
     * @param serverCapabilities The server capabilities from the session
     * @param accounts The accounts from the session
     * @returns An object containing arrays of server and account capability validation failures
     */
    validateCapabilityDefinition(
        capability: CapabilityDefinition,
        serverCapabilities: Record<string, unknown>,
        accounts: Record<string, { accountCapabilities: Record<string, unknown> }>,
    ): Promise<{
        serverCapabilities: Extract<ServerCapabilityValidationResult, { valid: false }>[];
        accountCapabilities: Extract<AccountCapabilityValidationResult, { valid: false }>[];
    }>;
}
