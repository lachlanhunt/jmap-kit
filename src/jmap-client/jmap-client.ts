/**
 * JMAP Client class implementation
 * @module jmap-client
 * @license MIT
 *
 * @example
 * import { JMAPClient } from 'jmap-client';
 * const transport = // ... create a transport
 *
 * const client = new JMAPClient(transport, {
 *     hostname: "api.example.com",
 * });
 *
 * await client.connect();
 *
 * // Do something with the client
 */

import pLimit from "p-limit";
import type { PrimitiveValue } from "url-template";
import { z } from "zod/v4";
import { CoreCapability } from "../capabilities/core-capability.js";
import { CapabilityRegistry } from "../capability-registry/capability-registry.js";
import type {
    AccountCapabilityValidationResult,
    CapabilityDefinition,
    CapabilityRegistryInterface,
    ServerCapabilityValidationResult,
} from "../capability-registry/types.js";
import { CORE_CAPABILITY_URI } from "../common/registry.js";
import type { Id, JMAPCapability, JMAPResponse, JMAPServerCapabilities } from "../common/types.js";
import { InvocationFactoryManager } from "../invocation-factory/invocation-factory-manager.js";
import { RequestBuilder } from "../request-builder/request-builder.js";
import type {
    CapabilityRegistrationResult,
    ClientContext,
    ConnectionStatus,
    EventEmitterFn,
    HeadersInit,
    JMAPAccount,
    JMAPClientInterface,
    JMAPClientOptions,
    JMAPSession,
    JMAPUploadResponse,
    Logger,
    Transport,
} from "./types.js";
import { assertConnected } from "./utils/assert-connected.js";
import { createEmitter } from "./utils/emitter.js";
import { filterSessionCapabilities } from "./utils/filter-session-capabilities.js";
import { JMAPRequestError } from "./utils/jmap-request-error.js";
import { createLogger } from "./utils/logger.js";
import { mergeHeaders } from "./utils/merge-headers.js";
import { expandUrlWithParams } from "./utils/template-utils.js";
import { createTransport } from "./utils/transport.js";
import { parseAndValidateJMAPSession } from "./utils/validate-session.js";

const WELL_KNOWN_JMAP = "/.well-known/jmap";

/**
 * JMAP Client for interacting with a JMAP server.
 *
 * This class manages the connection lifecycle, session state, and provides methods for
 * interacting with the JMAP API, including capability checks, file downloads, and
 * invocation requests and responses.
 */
export class JMAPClient implements JMAPClientInterface<RequestBuilder> {
    // Internal state
    #hostname: string | null;
    #port: number;
    #requestHeaders: Headers;
    #session: JMAPSession | null = null;
    #sessionState: JMAPSession["state"] | null = null;
    #_connectionStatus: ConnectionStatus = "disconnected";

    // Capability registry
    readonly #capabilityRegistry: CapabilityRegistry;

    /**
     * Set of all active (not yet aborted) AbortControllers created internally.
     * Controllers are removed from the set when aborted.
     */
    readonly #activeAbortControllers = new Set<AbortController>();

    /**
     * Set of all active (not yet settled) request promises.
     */
    readonly #activeRequests = new Set<Promise<unknown>>();

    // Concurrency limiters
    readonly #uploadLimit = pLimit(4); // Default to 4, updated when capabilities are known
    readonly #requestLimit = pLimit(4); // Default to 4, updated when capabilities are known

    // Utilities
    readonly #transport: Transport;
    readonly #responseFactory: InvocationFactoryManager;

    #currentLogger?: Logger;
    readonly #logger = createLogger(() => this.#currentLogger);

    #currentEmitter?: EventEmitterFn;
    readonly #emitter = createEmitter(() => this.#currentEmitter);

    /**
     * The current connection status of the client.
     */
    get connectionStatus() {
        return this.#_connectionStatus;
    }

    set #connectionStatus(status: ConnectionStatus) {
        /* v8 ignore if -- @preserve */
        /* istanbul ignore next -- defensive: public API prevents setting to same value */
        if (this.#_connectionStatus === status) {
            return; // Do not emit or log if status is unchanged
        }
        this.#_connectionStatus = status;

        const sessionState = this.#sessionState;
        this.#logger.info(`JMAP Client changed connection status: ${status}.`, { sessionState });
        this.#emitter("status-changed", { status, sessionState });
    }

    #connecting: Promise<void> | null = null;
    #disconnecting: Promise<void> | null = null;

    /**
     * Create a new JMAPClient instance.
     *
     * The provided Transport is responsible for all HTTP request concerns, including authentication,
     * network errors, and any custom headers or request logic required by the server. The client
     * itself does not handle authentication or low-level HTTP details.
     *
     * If the port is not specified, it defaults to 443.
     *
     * @param transport The transport implementation for HTTP requests, including authentication.
     * @param options JMAP client options including hostname, port, headers, logger, and emitter.
     */
    constructor(transport: Transport, { hostname, port = 443, headers, logger, emitter }: JMAPClientOptions) {
        // Wrap the transport so all requests and abort controllers are tracked
        this.#transport = createTransport(transport, this.#activeRequests, this.#activeAbortControllers);
        this.#currentLogger = logger;
        this.#currentEmitter = emitter;
        this.#hostname = hostname ?? null;
        this.#port = port;
        // Convert headers to Headers object if needed
        this.#requestHeaders = new Headers(headers ?? {});
        const clientContext: ClientContext = {
            logger: this.#logger,
            emitter: this.#emitter,
        };

        // Initialise the capability registry with the Core capability
        this.#capabilityRegistry = new CapabilityRegistry(CoreCapability, clientContext);

        this.#responseFactory = new InvocationFactoryManager(this, clientContext);
    }

    /**
     * Register one or more capabilities with the client.
     *
     * When called after the client is connected, each capability's schema is validated against
     * the session data. Capabilities that fail validation are rejected and not registered.
     * When called before connecting, capabilities are registered without validation.
     *
     * If called while the client is in the process of connecting, registration waits for the
     * connection to complete before validating. If the connection fails, capabilities are
     * registered without validation (no session to validate against).
     *
     * @param capabilities The capability definitions to register
     * @returns A result object containing arrays of validation failures (empty arrays if all succeeded)
     */
    async registerCapabilities(...capabilities: CapabilityDefinition[]): Promise<CapabilityRegistrationResult> {
        const allServerFailures: Extract<ServerCapabilityValidationResult, { valid: false }>[] = [];
        const allAccountFailures: Extract<AccountCapabilityValidationResult, { valid: false }>[] = [];

        await this.#awaitPendingConnection("registering capabilities");

        for (const capability of capabilities) {
            if (this.#capabilityRegistry.has(capability.uri)) {
                this.#logger.debug(`Capability already registered: ${capability.uri}`);
                continue;
            }

            if (await this.#validateCapability(capability, allServerFailures, allAccountFailures)) {
                this.#capabilityRegistry.register(capability);
                this.#logger.info(`Successfully registered capability: ${capability.uri}`);
            }
        }

        if (allServerFailures.length > 0 || allAccountFailures.length > 0) {
            this.#emitter("invalid-capabilities", {
                context: "registration",
                serverCapabilities: allServerFailures,
                accountCapabilities: allAccountFailures,
            });
        }

        return {
            serverCapabilities: allServerFailures,
            accountCapabilities: allAccountFailures,
        };
    }

    /**
     * If a connection is in progress, wait for it to settle before proceeding.
     *
     * @param reason A description of why the caller is waiting, used in the debug log message.
     * @param onError Called when the connection attempt fails. If omitted, the error is swallowed
     *                and the caller will see the client as disconnected.
     */
    async #awaitPendingConnection(reason: string, onError?: (error: unknown) => never): Promise<void> {
        if (this.connectionStatus !== "connecting") return;

        this.#logger.debug(`Waiting for JMAP Client to finish connecting before ${reason}`);
        try {
            await this.#connecting;
        } catch (error) {
            onError?.(error);
            // Connection failed — client is now disconnected, no session to validate against
        }
    }

    /**
     * Validate a capability's schema against the current session. Returns `true` when the
     * capability is valid or no validation is needed. Returns `false` when validation fails,
     * after logging errors and accumulating failures.
     */
    async #validateCapability(
        capability: CapabilityDefinition,
        serverFailures: Extract<ServerCapabilityValidationResult, { valid: false }>[],
        accountFailures: Extract<AccountCapabilityValidationResult, { valid: false }>[],
    ): Promise<boolean> {
        if (this.connectionStatus !== "connected" || !this.#session || !capability.schema) {
            return true;
        }

        const { serverCapabilities, accountCapabilities } = await this.#capabilityRegistry.validateCapabilityDefinition(
            capability,
            this.#session.capabilities,
            this.#session.accounts,
        );

        if (serverCapabilities.length === 0 && accountCapabilities.length === 0) {
            return true;
        }

        for (const failure of serverCapabilities) {
            this.#logger.error(
                `Rejecting capability ${failure.uri}: ${failure.errors.map((e) => e.message).join("; ")}`,
            );
        }
        for (const failure of accountCapabilities) {
            this.#logger.error(
                `Rejecting capability ${failure.uri} for account ${failure.accountId}: ${failure.errors.map((e) => e.message).join("; ")}`,
            );
        }
        serverFailures.push(...serverCapabilities);
        accountFailures.push(...accountCapabilities);
        return false;
    }

    /**
     * Set the hostname for the JMAP server. Only allowed while disconnected.
     *
     * @param hostname The hostname of the JMAP server
     * @throws Error if called after connecting.
     * @returns This client instance (for chaining).
     */
    withHostname(hostname: string) {
        if (this.connectionStatus !== "disconnected") {
            throw new Error("Cannot change hostname after connecting to a JMAP server");
        }
        this.#logger.debug("Setting hostname to %s", hostname);
        this.#hostname = hostname;
        return this;
    }

    /**
     * Set the port for the JMAP server. Only allowed while disconnected.
     *
     * @param port Port number.
     * @throws Error if called after connecting.
     * @returns This client instance (for chaining).
     */
    withPort(port: number) {
        if (this.connectionStatus !== "disconnected") {
            throw new Error("Cannot change port after connecting to a JMAP server");
        }
        this.#logger.debug("Setting port to %d", port);
        this.#port = port;
        return this;
    }

    /**
     * Set additional headers for requests.
     *
     * @param headers Additional headers to merge.
     * @returns This client instance (for chaining).
     */
    withHeaders(headers: HeadersInit) {
        this.#requestHeaders = mergeHeaders(this.#requestHeaders, headers);
        return this;
    }

    /**
     * Set a custom logger for the client.
     *
     * @param logger The logger instance or function.
     * @returns This client instance (for chaining).
     */
    withLogger(logger: Logger) {
        this.#currentLogger = logger;
        return this;
    }

    /**
     * Set a custom event emitter for the client.
     *
     * @param emitter The event emitter function to handle events.
     * @returns This client instance (for chaining).
     */
    withEmitter(emitter: EventEmitterFn) {
        this.#currentEmitter = emitter;
        return this;
    }

    /**
     * Update concurrency limits based on server capabilities
     */
    #updateConcurrencyLimits(): void {
        const coreCapabilities = this.serverCapabilities?.[CORE_CAPABILITY_URI];
        if (coreCapabilities) {
            this.#uploadLimit.concurrency = coreCapabilities.maxConcurrentUpload;
            this.#requestLimit.concurrency = coreCapabilities.maxConcurrentRequests;
            this.#logger.debug(
                `Updated concurrency limits: uploads=${coreCapabilities.maxConcurrentUpload}, requests=${coreCapabilities.maxConcurrentRequests}`,
            );
            /* v8 ignore start -- @preserve defensive: Core capabilities are always present when connected */
        } else {
            this.#logger.warn("No core capabilities found, using default concurrency limits");
            this.#uploadLimit.concurrency = 4;
            this.#requestLimit.concurrency = 4;
        }
        /* v8 ignore stop -- @preserve */
    }

    async #connect(signal?: AbortSignal): Promise<void> {
        if (!this.#hostname) {
            this.#logger.error("JMAP Client attempted to connect without a specified hostname");
            throw new Error("Cannot connect to JMAP server without a hostname");
        }

        this.#connectionStatus = "connecting";

        const url = new URL(WELL_KNOWN_JMAP, `https://${this.#hostname}:${this.#port}`);
        this.#logger.debug(`JMAP Client connecting to ${url.toString()}`);

        try {
            const jsonResponse = await this.#transport.get<JMAPSession>(url, {
                headers: this.#requestHeaders,
                responseType: "json",
                ...(signal ? { signal } : {}),
            });

            if (this.connectionStatus !== "connecting") {
                // Do not transition to connected if not still connecting (e.g., disconnecting)
                // It's possible that disconnect() was called while waiting for the session response
                // We would normally expect #transport.get() to throw an AbortError in this case, but
                // we handle it gracefully here because we can't guarantee the behaviour of the Transport implementation.
                this.#logger.warn(
                    `JMAP Client connection was interrupted before completion, client ${this.connectionStatus}`,
                );
                return;
            }

            // Structural validation of the session response
            const parsedSession = parseAndValidateJMAPSession(jsonResponse, this.#logger);

            // Validate capability-specific session data against registered schemas
            const [serverResults, accountResults] = await Promise.all([
                this.#capabilityRegistry.validateServerCapabilities(parsedSession.capabilities),
                this.#capabilityRegistry.validateAccountCapabilities(parsedSession.accounts),
            ]);

            // Core capability failure is fatal — the client cannot operate without it
            const coreFailure = serverResults.find((r) => !r.valid && r.uri === CORE_CAPABILITY_URI);
            if (coreFailure && !coreFailure.valid) {
                const message = `Core server capability validation failed:\n${coreFailure.errors.map((e) => `  - ${e.message}`).join("\n")}`;
                this.#logger.error(message);
                throw new Error(message);
            }

            // Collect non-Core failures
            const serverFailures = serverResults.filter(
                (r): r is typeof r & { valid: false } => !r.valid && r.uri !== CORE_CAPABILITY_URI,
            );
            const accountFailures = accountResults.filter((r): r is typeof r & { valid: false } => !r.valid);

            // Filter invalid capabilities and freeze
            this.#session = filterSessionCapabilities(parsedSession, serverFailures, accountFailures);

            // Emit a single event if any capabilities were stripped
            if (serverFailures.length > 0 || accountFailures.length > 0) {
                for (const failure of serverFailures) {
                    this.#logger.warn(
                        `Stripping server capability ${failure.uri}: ${failure.errors.map((e) => e.message).join("; ")}`,
                    );
                }
                for (const failure of accountFailures) {
                    this.#logger.warn(
                        `Stripping account capability ${failure.uri} from account ${failure.accountId}: ${failure.errors.map((e) => e.message).join("; ")}`,
                    );
                }
                this.#emitter("invalid-capabilities", {
                    context: "connection",
                    serverCapabilities: serverFailures,
                    accountCapabilities: accountFailures,
                });
            }

            this.#sessionState = this.#session.state;
            this.#updateConcurrencyLimits();
            this.#connectionStatus = "connected";
        } catch (error) {
            let warningMessage;
            let errorMessage;

            if (error instanceof Error && error.cause instanceof Error && error.cause.name === "ZodError") {
                warningMessage = "JMAP Client is disconnecting due to an invalid session response";
                errorMessage = "JMAP Client disconnected due to an invalid session response";
            } else if (error instanceof DOMException && error.name === "AbortError") {
                warningMessage = "JMAP Client is disconnecting due to connection being aborted";
                errorMessage = "JMAP Client disconnected due to connection being aborted";
            } else {
                warningMessage = "JMAP Client is disconnecting due to a transport error";
                errorMessage = "JMAP Client disconnected due to a transport error";
            }

            this.#logger.warn(warningMessage, { error });
            await this.disconnect();

            this.#logger.error(errorMessage, { error });

            throw error;
        }
    }

    /**
     * Connect to the JMAP server and fetch the session object.
     *
     * This method is idempotent: if called multiple times while a connection is already in progress,
     * each call will return a new Promise that resolves or rejects with the same result as the in-progress connection.
     * Only one connection attempt will be made at a time; concurrent calls will not trigger multiple connections.
     *
     * @throws Error if hostname is not set or connection fails.
     */
    async connect(signal?: AbortSignal): Promise<void> {
        if (this.connectionStatus === "disconnecting") {
            this.#logger.error("JMAP Client attempted to connect while in the process of disconnecting");
            throw new Error("Cannot reconnect while disconnecting");
        }
        if (this.#connecting) {
            this.#logger.debug("JMAP Client is already connecting, returning existing promise");
            return this.#connecting;
        }
        try {
            this.#connecting = this.#connect(signal);
            await this.#connecting;
        } finally {
            this.#logger.info("JMAP Client connected");
            this.#connecting = null;
        }
    }

    async #disconnect(): Promise<void> {
        this.#connectionStatus = "disconnecting";
        // Abort all active requests
        for (const controller of this.#activeAbortControllers) {
            controller.abort();
        }
        // Wait for all in-flight requests to settle
        if (this.#activeRequests.size > 0) {
            await Promise.allSettled(Array.from(this.#activeRequests));
        }
        this.#session = null;
        this.#sessionState = null;
        this.#connectionStatus = "disconnected";
    }

    /**
     * Disconnect from the JMAP server and clear session state.
     *
     * This method is asynchronous and will not set the status to 'disconnected' until all
     * in-flight requests have settled (resolved or rejected) after being aborted.
     * It is idempotent: if already disconnecting, it returns the same promise.
     */
    async disconnect(): Promise<void> {
        if (this.connectionStatus === "disconnected") {
            this.#logger.debug("JMAP Client is already disconnected");
            return;
        }
        if (this.#disconnecting) {
            this.#logger.debug("JMAP Client is already disconnecting, returning existing promise");
            return this.#disconnecting;
        }
        try {
            this.#disconnecting = this.#disconnect();
            await this.#disconnecting;
        } finally {
            this.#logger.info("JMAP Client disconnected");
            this.#disconnecting = null;
        }
    }

    /**
     * Get the capability registry.
     *
     * This provides read-only access to the registry of JMAP capabilities.
     * To register new capabilities, use the registerCapability method.
     */
    get capabilityRegistry(): CapabilityRegistryInterface {
        return this.#capabilityRegistry;
    }

    /**
     * The server capabilities from the session object, or null if not connected.
     */
    get serverCapabilities(): Readonly<JMAPServerCapabilities> | null {
        return this.#session?.capabilities ?? null;
    }

    /**
     * Determines if a given capability identified by its URN is supported by the server.
     * @param urn The URN of the JMAP capability being queried.
     * @returns True if supported, false otherwise.
     */
    isSupported(urn: JMAPCapability) {
        return Object.hasOwn(this.serverCapabilities ?? { [CORE_CAPABILITY_URI]: {} }, urn);
    }

    /**
     * The accounts from the session object, or null if not connected.
     */
    get accounts(): Readonly<Record<Id, JMAPAccount>> | null {
        return this.#session?.accounts ?? null;
    }

    /**
     * The primary accounts from the session object, or an empty object if not connected.
     */
    get primaryAccounts(): Readonly<Partial<Record<JMAPCapability, Id>>> {
        return this.#session?.primaryAccounts ?? {};
    }

    /**
     * The username from the session object, or an empty string if not connected.
     */
    get username() {
        return this.#session?.username ?? "";
    }

    /**
     * The API URL from the session object, or an empty string if not connected.
     */
    get apiUrl() {
        return this.#session?.apiUrl ?? "";
    }

    /**
     * The download URL template from the session object, or an empty string if not connected.
     */
    get downloadUrl() {
        return this.#session?.downloadUrl ?? "";
    }

    /**
     * The upload URL template from the session object, or an empty string if not connected.
     */
    get uploadUrl() {
        return this.#session?.uploadUrl ?? "";
    }

    /**
     * The event source URL template from the session object, or an empty string if not connected.
     */
    get eventSourceUrl() {
        return this.#session?.eventSourceUrl ?? "";
    }

    /**
     * Download a file from the server.
     *
     * @param accountId The id of the account to which the record with the blobId belongs.
     * @param blobId The blobId representing the data of the file to download.
     * @param name The name for the file; the server MUST return this as the filename if it sets a Content-Disposition header.
     * @param type The type for the server to set in the Content-Type header of the response; the blobId only represents the binary data and does not have a content-type innately associated with it.
     * @param signal Optional AbortSignal to cancel the request.
     * @throws Error if the client is not connected, downloadUrl is missing from session, accountId is not listed in the session's accounts.
     * @throws JMAPRequestError for JMAP protocol errors (non-200 status codes with {@link https://www.rfc-editor.org/rfc/rfc7807.html RFC 7807} Problem Details).
     * @throws TypeError If parsing the response fails.
     * @throws If a network error, timeout, or other transport failure occurs.
     * @returns A promise that resolves to a Blob containing the data of the file.
     */
    async downloadFile(accountId: Id, blobId: Id, name: string, type: string, signal?: AbortSignal): Promise<Blob> {
        assertConnected(this.connectionStatus);

        const url = this.getDownloadUrl(accountId, blobId, name, type);
        this.#logger.debug(`JMAP Client downloading file from ${url.toString()}`);

        try {
            const headers = mergeHeaders(this.#requestHeaders, { Accept: type });

            return await this.#transport.get<Blob>(url, {
                headers,
                responseType: "blob",
                ...(signal ? { signal } : {}),
            });
        } catch (error) {
            // Handle different types of errors
            if (error instanceof JMAPRequestError) {
                // JMAP request-level error (Problem Details object)
                this.#logger.error(`Download request error: ${error.type}`, { error });
                this.#emitter("download-error", { accountId, blobId, error });
            } else {
                // Transport or network error
                this.#logger.error(`File download from account ${accountId} failed`, { error });
                this.#emitter("transport-error", { error });
            }

            throw error;
        }
    }

    /**
     * Upload a file to the server.
     *
     * @param accountId The id of the account to upload to.
     * @param file The file data to upload. Can be a Blob, ArrayBuffer, or File.
     * @param signal Optional AbortSignal to cancel the request.
     * @throws Error if the file size exceeds the maxSizeUpload limit from server capabilities.
     * @throws Error if the client is not connected, uploadUrl is missing from session, or accountId is not listed in the session's accounts.
     * @throws JMAPRequestError for JMAP protocol errors (non-200 status codes with {@link https://www.rfc-editor.org/rfc/rfc7807.html RFC 7807} Problem Details).
     * @throws TypeError If parsing the response fails.
     * @throws If a network error, timeout, or other transport failure occurs.
     * @returns A promise that resolves to the upload response from the server.
     */
    async uploadFile(
        accountId: Id,
        file: Blob | ArrayBuffer | File,
        signal?: AbortSignal,
    ): Promise<JMAPUploadResponse> {
        assertConnected(this.connectionStatus);

        // Check file size against server capability limit
        const capabilities = this.serverCapabilities;
        /* v8 ignore start -- defensive: assertConnected() above guarantees serverCapabilities is non-null */
        if (!capabilities) {
            throw new Error("Server capabilities not available");
        }
        /* v8 ignore stop */

        const coreCapabilities = capabilities[CORE_CAPABILITY_URI];
        const maxSize = coreCapabilities.maxSizeUpload;

        const fileSize = file instanceof ArrayBuffer ? file.byteLength : file.size;
        if (fileSize > maxSize) {
            throw new Error(`File size (${fileSize}) exceeds server's maximum upload size (${maxSize})`);
        }

        // Get the file type, defaulting to application/octet-stream for ArrayBuffer or empty type
        const fileType = file instanceof Blob && file.type ? file.type : "application/octet-stream";

        const url = this.getUploadUrl(accountId);
        this.#logger.debug(`JMAP Client uploading file to ${url.toString()}`);

        try {
            const { pendingCount, activeCount, concurrency } = this.#uploadLimit;

            if (activeCount - concurrency + pendingCount >= 0) {
                this.#logger.debug(
                    `Preparing to queue file upload (${pendingCount} pending, ${activeCount} active of ${concurrency} max concurrent uploads)`,
                );
            }

            const headers = mergeHeaders(this.#requestHeaders, { "Content-Type": fileType });

            return await this.#uploadLimit(() =>
                this.#transport.post<JMAPUploadResponse>(url, {
                    body: file,
                    responseType: "json",
                    ...(signal ? { signal } : {}),
                    headers,
                }),
            );
        } catch (error) {
            // Handle different types of errors
            if (error instanceof JMAPRequestError) {
                // JMAP request-level error (Problem Details object)
                this.#logger.error(`Upload request error: ${error.type}`, { error });
                this.#emitter("upload-error", { accountId, error });
            } else {
                // Transport or network error
                this.#logger.error(`File upload to account ${accountId} failed`, { error });
                this.#emitter("transport-error", { error });
            }

            throw error;
        }
    }

    /**
     * Get a URL from a template in the session object.
     *
     * @param params The parameters for URL template validation and expansion
     * @param params.urlTemplate The name of the URL template property in the session object
     * @param params.options The parameter values to use for template expansion
     * @param params.schema The Zod schema to validate the options
     * @throws Error if the Client is not connected to a JMAP server
     * @throws Error if the specified URL template is missing from session
     * @throws ZodError if the options fail schema validation
     * @returns The expanded URL
     */
    #getUrlFromTemplate<T extends Record<string, PrimitiveValue>>({
        urlTemplate,
        options,
        schema,
    }: {
        urlTemplate: "downloadUrl" | "uploadUrl" | "eventSourceUrl";
        options: T;
        schema: z.ZodType<T>;
    }): URL {
        assertConnected(this.connectionStatus);

        const template = this[urlTemplate];
        if (!template) {
            throw new Error(`Missing ${urlTemplate} in session`);
        }

        // Validate options against the provided schema
        const validatedOptions = schema.parse(options);

        // Expand the template with parameters
        return expandUrlWithParams(template, validatedOptions);
    }

    /**
     * Get the parsed download URL for a file.
     *
     * @param accountId The id of the account to which the record with the blobId belongs.
     * @param blobId The blobId representing the data of the file to download.
     * @param name The name for the file; the server MUST return this as the filename if it sets a Content-Disposition header.
     * @param type The type for the server to set in the Content-Type header of the response; the blobId only represents the binary data and does not have a content-type innately associated with it.
     * @throws Error if the Client is not connected to a JMAP server
     * @throws Error if downloadUrl is missing from session
     * @throws Error if accountId is not listed in the session's accounts
     * @returns the download URL with variables expanded
     */
    getDownloadUrl(accountId: Id, blobId: Id, name: string, type: string): URL {
        // Define schema for download URL parameters with account validation
        const downloadUrlSchema = z.object({
            accountId: z.string().refine((id: string) => this.accounts && Object.hasOwn(this.accounts, id), {
                message: `Account ${accountId} not found in session`,
            }),
            blobId: z.string(),
            name: z.string(),
            type: z.string(),
        });

        // Create options object with required parameters
        const options = { accountId, blobId, name, type };

        return this.#getUrlFromTemplate({
            urlTemplate: "downloadUrl",
            options,
            schema: downloadUrlSchema,
        });
    }

    /**
     * Get the parsed upload URL for a file.
     *
     * @param accountId The id of the account to upload the file to.
     * @throws Error if the Client is not connected to a JMAP server
     * @throws Error if uploadUrl is missing from session
     * @throws Error if accountId is not listed in the session's accounts
     * @returns the upload URL with variables expanded
     */
    getUploadUrl(accountId: Id): URL {
        // Define schema for upload URL parameters with account validation
        const uploadUrlSchema = z.object({
            accountId: z.string().refine((id: string) => this.accounts && Object.hasOwn(this.accounts, id), {
                message: `Account ${accountId} not found in session`,
            }),
        });

        // Create options object with required parameters
        const options = { accountId };

        return this.#getUrlFromTemplate({
            urlTemplate: "uploadUrl",
            options,
            schema: uploadUrlSchema,
        });
    }

    /**
     * Get the parsed event source URL.
     *
     * @param types Either an array of event types to listen for, or "*" to listen for all types.
     * @param closeafter Either "state" (end response after pushing a state event) or "no" (persist connection).
     * @param ping Positive integer value in seconds. If non-zero, the server will send a ping event after this time elapses since the previous event.
     * @throws Error if the Client is not connected to a JMAP server
     * @throws Error if eventSourceUrl is missing from session
     * @throws Error if ping is negative
     * @returns the event source URL with variables expanded
     */
    getEventSourceUrl(types: string[] | "*", closeafter: "state" | "no", ping: number): URL {
        // Define schema for event source URL parameters
        const eventSourceUrlSchema = z.object({
            types: z.string(),
            closeafter: z.enum(["state", "no"]),
            ping: z.number().nonnegative(),
        });

        // Create options object with required parameters
        const options = {
            types: Array.isArray(types) ? types.join(",") : types,
            closeafter,
            ping,
        };

        return this.#getUrlFromTemplate({
            urlTemplate: "eventSourceUrl",
            options,
            schema: eventSourceUrlSchema,
        });
    }

    /**
     * Create a new RequestBuilder instance linked to this client.
     *
     * The builder will have access to the client's current capabilities and session state,
     * allowing it to validate requests and enforce server limits.
     *
     * @returns A new RequestBuilder instance
     */
    createRequestBuilder(): RequestBuilder {
        return new RequestBuilder(this, { logger: this.#logger, emitter: this.#emitter });
    }

    /**
     * Send an API request to the JMAP server.
     *
     * @param jmapRequest The request builder instance.
     * @param signal Optional AbortSignal to cancel the request.
     * @throws Error if the client is not connected, disconnecting, or failed to connect.
     * @throws JMAPRequestError for JMAP protocol errors (non-200 status codes with {@link https://www.rfc-editor.org/rfc/rfc7807.html RFC 7807} Problem Details).
     * @throws TypeError If parsing the response fails.
     * @throws If a network error, timeout, or other transport failure occurs.
     * @returns The parsed response from the server.
     */
    async sendAPIRequest(jmapRequest: RequestBuilder, signal?: AbortSignal) {
        if (this.connectionStatus === "disconnected" || this.connectionStatus === "disconnecting") {
            this.#logger.error(`Failed to send API request because the JMAP Client is ${this.connectionStatus}`);
            throw new Error(`Cannot send API request, client ${this.connectionStatus}`);
        }

        await this.#awaitPendingConnection("sending API request", (error) => {
            this.#logger.error("Failed to send API request because the JMAP Client failed to connect", { error });
            throw new Error("Failed to send API request, client failed to connect");
        });

        assertConnected(this.connectionStatus);

        try {
            const { pendingCount, activeCount, concurrency } = this.#requestLimit;

            if (activeCount - concurrency + pendingCount >= 0) {
                this.#logger.debug(
                    `Preparing to queue JMAP API request (${pendingCount} pending, ${activeCount} active of ${concurrency} max concurrent requests)`,
                );
            }

            this.#logger.info("Sending JMAP API request");
            const result = await this.#requestLimit(async () => {
                const { body, headers } = await jmapRequest.serialize();

                // Merge client headers with serialisation headers using clean pattern
                const finalHeaders = mergeHeaders(this.#requestHeaders, headers);

                return this.#transport.post<JMAPResponse>(this.apiUrl, {
                    body,
                    headers: finalHeaders,
                    responseType: "json",
                    ...(signal ? { signal } : {}),
                });
            });

            this.#logger.info("API response received, checking session state");
            if (this.#sessionState !== result.sessionState) {
                this.#logger.warn(
                    "JMAP Server session state has changed; client may be out of sync. Reconnection recommended.",
                );

                this.#emitter("session-stale", {
                    oldSessionState: this.#sessionState,
                    newSessionState: result.sessionState,
                });
            } else {
                this.#logger.debug("JMAP Server session state is unchanged");
            }

            const methodResponses = this.#responseFactory.createInvocations(
                result.methodResponses,
                jmapRequest.reverseIdMap,
            );

            return { methodResponses, sessionState: result.sessionState, createdIds: result.createdIds ?? {} };
        } catch (error) {
            // Handle different types of errors
            if (error instanceof JMAPRequestError) {
                // JMAP request-level error
                this.#logger.error(`JMAP request error: ${error.type}`, { error });
                this.#emitter("request-error", { error });
            } else {
                // Transport or network error
                this.#logger.error("API request failed", { error });
                this.#emitter("transport-error", { error });
            }

            throw error;
        }
    }
}
