import type {
    PluginData,
    TransformerExecutionContext,
    ValidationResult,
    ValidatorExecutionContext,
} from "../capability-registry/types.js";
import { CORE_CAPABILITY_URI } from "../common/registry.js";
import type { Id, IdMap, JMAPCapability, JMAPRequest, JMAPRequestInvocation } from "../common/types.js";
import { idGenerator } from "../common/utils.js";
import type { Invocation } from "../invocation/invocation.js";
import type { BaseInvocationArgs } from "../invocation/types.js";
import type { ClientContext, JMAPClientInterface, Logger } from "../jmap-client/types.js";

const ID_PREFIX = "id_";

export class RequestBuilder {
    readonly #client: JMAPClientInterface<RequestBuilder>;

    readonly #logger: Logger;
    // readonly #emitter: EventEmitterFn;

    readonly #methods = new Set<Invocation<BaseInvocationArgs>>();
    #createdIds: Map<string, string> | null = null;
    readonly #idMap = new Map<symbol, Id>();

    constructor(client: JMAPClientInterface<RequestBuilder>, { logger }: ClientContext) {
        this.#client = client;
        this.#logger = logger;
    }

    /** Get the set of unique URIs that will be included in the `using` parameter of the JMAP request */
    get using(): Set<JMAPCapability> {
        // RFC 8620 errata (EID 6606) clarifies that core MUST be present in `using` for every request.
        return new Set([CORE_CAPABILITY_URI, ...[...this.#methods].map((invocation) => invocation.uri)]);
    }

    /** Get the collection of method calls that are included in this request */
    get methodCalls(): readonly Invocation<BaseInvocationArgs>[] {
        return Object.freeze([...this.#methods]);
    }

    /** Get the map of created IDs that are included in this request */
    get createdIds(): Readonly<Record<string, string>> | null {
        return this.#createdIds ? Object.freeze(Object.fromEntries(this.#createdIds) as Record<Id, Id>) : null;
    }

    /** Get the map of client-specified creation IDs to server-assigned IDs */
    get idMap() {
        const entries = [...this.#idMap];
        return new Map(entries);
    }

    /** Get the reverse map of server-assigned IDs to client-specified creation IDs */
    get reverseIdMap() {
        const entries = [...this.#idMap].map<[Id, symbol]>(([symbol, id]) => [id, symbol]);
        return new Map(entries);
    }

    /**
     * Add a method call to the request. All methods must be unique. If the method
     * already exists in the request, it will not be added again.
     *
     * @param method The method call to add to the request
     * @returns The invocation builder instance to allow for method chaining
     * @throws Error if the method's capability is not registered with the client
     * @throws Error if adding this method would exceed the server's maxCallsInRequest limit
     * @throws AggregateError if the invocation validation fails
     */
    add(method: Invocation<BaseInvocationArgs>): this {
        // Ensure the method's capability is registered with the client
        if (!this.#client.capabilityRegistry.has(method.uri)) {
            this.#logger.error(`Cannot add method: Unknown capability '${method.uri}'`);
            throw new Error(`Unknown capability: ${method.uri}`);
        }

        // Check if the method is already in the set
        if (this.#methods.has(method)) {
            this.#logger.debug(`Method ${method.name} already exists in request, skipping`);
            return this;
        }

        // Check if adding this method would exceed the server's maxCallsInRequest limit
        const serverCapabilities = this.#client.serverCapabilities;
        if (serverCapabilities) {
            const { maxCallsInRequest } = serverCapabilities[CORE_CAPABILITY_URI];
            if (this.#methods.size + 1 > maxCallsInRequest) {
                this.#logger.error(
                    `Cannot add method ${method.name}: Would exceed server limit of ${maxCallsInRequest} method calls (current: ${this.#methods.size})`,
                );
                throw new Error(
                    `Cannot add method: Request would exceed the server limit of ${maxCallsInRequest} method calls.`,
                );
            }
        }

        this.#logger.debug(`Adding method ${method.name} to request (${this.#methods.size + 1} total methods)`);

        this.#methods.add(method);
        return this;
    }

    /**
     * Remove a method call from the request. If the method does not exist in the
     * request, this method will do nothing.
     *
     * @param method The method call to remove from the request
     * @returns The invocation builder instance to allow for method chaining
     */
    remove(method: Invocation<BaseInvocationArgs>): this {
        if (this.#methods.has(method)) {
            this.#logger.debug(`Removing method ${method.name} from request`);
            this.#methods.delete(method);
        } else {
            this.#logger.debug(`Method ${method.name} not found in request, nothing to remove`);
        }
        return this;
    }

    /**
     * Add the map of client specified creation IDs to server assigned IDs, to be included in the request.
     *
     * This may be invoked with an empty object to initialise the createdIds for the first request,
     * or with a map of client-specified creation IDs to the server-assigned IDs that were obtained from a
     * previous response.
     *
     * @param createdIds The map of client-specified creation IDs to the server assigned IDs
     * @returns The invocation builder instance to allow for method chaining
     */
    addCreatedIds(createdIds: IdMap): this {
        const entries = Object.entries(createdIds);
        this.#logger.debug(`Adding ${entries.length} created IDs to request`);

        this.#createdIds ??= new Map();

        for (const [key, value] of entries) {
            this.#createdIds.set(key, value);
        }

        return this;
    }

    /**
     * Reset the map of creation ids to remove any that had been previously added.
     * After invoking this, the createdIds property will will be omitted from the request.
     */
    clearCreatedIds(): this {
        const previousCount = this.#createdIds?.size ?? 0;
        if (previousCount > 0) {
            this.#logger.debug(`Clearing ${previousCount} created IDs from request`);
        }
        this.#createdIds = null;
        return this;
    }

    /**
     * Build the JMAP request object from the current state of the builder.
     *
     * This will generate unique IDs for each method call, and resolve any
     * client-specified creation IDs to server-assigned IDs if they were provided.
     *
     * @param idPrefix The prefix to use for generated IDs (default is "id_")
     * @returns The constructed JMAP request object
     * @throws AggregateError if the pre-build validation fails
     */
    build(idPrefix = ID_PREFIX): JMAPRequest {
        this.#logger.debug(`Building JMAP request with ${this.#methods.size} method calls`);

        const generateId = idGenerator(idPrefix);

        // Map invocations to request format with IDs
        const methodCalls = this.methodCalls.map<JMAPRequestInvocation>((invocation) => {
            const newId = generateId.next().value;
            this.#idMap.set(invocation.id, newId);
            return invocation.resolve(newId, (id) => this.#idMap.get(id));
        });

        const createdIds: IdMap | null = this.#createdIds ? Object.fromEntries(this.#createdIds) : null;

        // Create initial request object
        const request: JMAPRequest = {
            using: [...this.using],
            methodCalls,
            ...(createdIds && {
                createdIds,
            }),
        };

        this.#logger.debug(`Built JMAP request using capabilities: ${[...this.using].join(", ")}`);
        return request;
    }

    /**
     * Serialise the request for sending as a request body.
     * By default, returns a JSON string, but can be extended to support other formats.
     *
     * @returns The serialised request (string, Blob, ArrayBuffer, etc.)
     * @throws AggregateError if the pre-serialization validation fails
     * @throws AggregateError if the post-serialization validation fails
     */
    async serialize() {
        this.#logger.info(`Serialising JMAP request with ${this.#methods.size} method calls`);

        // Validate all invocations
        await this.validateInvocations();

        // Build the request first
        const builtRequest = this.build();

        // Run pre-build validators
        let { valid, errors = [] } = await this.#validateLifecycleHook("pre-build", builtRequest);

        if (!valid) {
            this.#logger.error(`Pre-build validation failed with ${errors.length} errors`);
            throw new AggregateError(errors, "Pre-build validation failed");
        }

        // Apply pre-serialization transformers
        const transformedRequest = await this.#transformBuild(builtRequest);

        // Run pre-serialization validators
        ({ valid, errors = [] } = await this.#validateLifecycleHook("pre-serialization", transformedRequest));

        if (!valid) {
            this.#logger.error(`Pre-serialization validation failed with ${errors.length} errors`);
            throw new AggregateError(errors, `Pre-serialization validation failed`);
        }

        // Serialise to JSON
        const body = JSON.stringify(transformedRequest);

        const serializedData: PluginData<"post-serialization"> = {
            body,
            headers: new Headers({
                "Content-Type": "application/json",
            }),
        };

        const transformedSerialization = await this.#transformSerialization(serializedData);

        // Run post-serialization validators on the serialised string
        ({ valid, errors = [] } = await this.#validateSerialization(transformedSerialization));

        if (!valid) {
            this.#logger.error(`Post-serialization validation failed with ${errors.length} errors`);
            throw new AggregateError(errors, `Post-serialization validation failed`);
        }

        this.#logger.debug(`Successfully serialised JMAP request (${body.length} characters)`);
        return transformedSerialization;
    }

    /**
     * Send this request to the JMAP server using the associated client.
     *
     * @param signal Optional AbortSignal to cancel the request.
     * @returns The parsed response from the server.
     */
    async send(signal?: AbortSignal) {
        this.#logger.info(
            `Sending JMAP request with ${this.#methods.size} method ${this.#methods.size === 1 ? "call" : "calls"}`,
        );
        return this.#client.sendAPIRequest(this, signal);
    }

    toJSON(): JMAPRequest {
        return this.build();
    }

    /**
     * Validate all invocations currently in the request.
     *
     * @returns A Promise resolving to the invocation builder instance
     * @throws AggregateError if any invocation validation fails
     */
    async validateInvocations(): Promise<this> {
        this.#logger.debug(`Validating ${this.methodCalls.length} invocations`);

        // Validate all invocations. Aggregate the errors from all of them before throwing
        const validationErrors: Error[] = [];
        for (const invocation of this.methodCalls) {
            const { valid, errors = [] } = await this.#validateInvocation(invocation);
            if (!valid) {
                this.#logger.warn(`Validation failed for ${invocation.name}: ${errors.length} errors`);
                validationErrors.push(...errors);
            }
        }

        if (validationErrors.length > 0) {
            this.#logger.error(`Invocation validation failed with ${validationErrors.length} total errors`);
            throw new AggregateError(validationErrors, `Invocation validation failed`);
        }

        this.#logger.debug(`All invocations validated successfully`);
        return this;
    }

    /**
     * Validates an invocation against registered validators
     *
     * @param invocation The invocation to validate
     */
    async #validateInvocation(invocation: Invocation<BaseInvocationArgs>): Promise<ValidationResult> {
        // Only run validation if the client is connected (i.e., has serverCapabilities and accounts)
        const serverCapabilities = this.#client.serverCapabilities;
        const accounts = this.#client.accounts;
        if (!serverCapabilities || !accounts) return { valid: true };

        const registry = this.#client.capabilityRegistry;

        // Use the unified executeValidators method with the invocation context
        return registry.executeValidators({
            hook: "invocation",
            context: {
                invocation,
                serverCapabilities,
                accounts,
            },
        });
    }

    /**
     * Validates a request against registered lifecycle hook validators
     *
     * @param hook The lifecycle hook to validate for
     * @param data The request data to validate
     */
    async #validateLifecycleHook<THook extends "pre-build" | "pre-serialization">(
        hook: THook,
        data: PluginData<THook>,
    ): Promise<ValidationResult> {
        // Only run validation if the client is connected (i.e., has serverCapabilities and accounts)
        const serverCapabilities = this.#client.serverCapabilities;
        const accounts = this.#client.accounts;
        if (!serverCapabilities || !accounts) return { valid: true };

        const registry = this.#client.capabilityRegistry;

        const executionContext: ValidatorExecutionContext<"pre-build" | "pre-serialization"> = {
            hook,
            context: {
                data,
                serverCapabilities,
                accounts,
            },
        };

        return registry.executeValidators(executionContext);
    }

    /**
     * Validates serialised request data against registered post-serialization validators
     *
     * @param data The serialised data
     */
    async #validateSerialization(data: PluginData<"post-serialization">): Promise<ValidationResult> {
        // Only run validation if the client is connected (i.e., has serverCapabilities and accounts)
        const serverCapabilities = this.#client.serverCapabilities;
        const accounts = this.#client.accounts;
        if (!serverCapabilities || !accounts) return { valid: true };

        const registry = this.#client.capabilityRegistry;

        // Use the unified executeValidators method with the post-serialization context
        return registry.executeValidators({
            hook: "post-serialization",
            context: {
                data,
                serverCapabilities,
                accounts,
            },
        });
    }

    /**
     * Applies transformation plugins for the pre-serialization hook
     *
     * @param hook The lifecycle hook to transform for
     * @param data The request data to transform
     */
    async #transformBuild(data: PluginData<"pre-serialization">): Promise<PluginData<"pre-serialization">> {
        const serverCapabilities = this.#client.serverCapabilities;
        const accounts = this.#client.accounts;
        if (!serverCapabilities || !accounts) return data;

        const registry = this.#client.capabilityRegistry;

        const executionContext: TransformerExecutionContext<"pre-serialization"> = {
            context: {
                data,
                serverCapabilities,
                accounts,
            },
        };

        return await registry.executeBuildTransformers(executionContext);
    }

    /**
     * Applies transformation plugins for the post-serialization hook
     *
     * @param data The serialised data to transform
     */
    async #transformSerialization(data: PluginData<"post-serialization">): Promise<PluginData<"post-serialization">> {
        const serverCapabilities = this.#client.serverCapabilities;
        const accounts = this.#client.accounts;
        if (!serverCapabilities || !accounts) return data;

        const registry = this.#client.capabilityRegistry;

        const executionContext: TransformerExecutionContext<"post-serialization"> = {
            context: {
                data,
                serverCapabilities,
                accounts,
            },
        };

        return await registry.executeSerializationTransformers(executionContext);
    }
}
