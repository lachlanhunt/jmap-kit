import { z } from "zod/v4";
import type {
    AccountCapabilityValidationResult,
    CapabilityDefinition,
    CapabilityRegistryInterface,
    ServerCapabilityValidationResult,
} from "../capability-registry/types.js";
import type {
    Id,
    IdMap,
    JMAPAccountCapabilities,
    JMAPCapability,
    JMAPCapabilityUri,
    JMAPServerCapabilities,
} from "../common/types.js";
import { JMAPAccountCapabilitiesSchema, JMAPServerCapabilitiesSchema } from "../common/types.js";
import type { InvocationList } from "../invocation-factory/invocation-list.js";
import type { BaseInvocationArgs } from "../invocation/types.js";
import type { JMAPRequestError } from "./utils/jmap-request-error.js";

/**
 * Comprehensive interface for JMAP client functionality.
 * This interface defines all the methods and properties that a JMAP client should provide.
 */
export interface JMAPClientInterface<T> {
    // Connection management
    /** The current connection status of the client */
    readonly connectionStatus: ConnectionStatus;

    /** Connect to the JMAP server */
    connect(signal?: AbortSignal): Promise<void>;

    /** Disconnect from the JMAP server */
    disconnect(): Promise<void>;

    // Session and capabilities
    /** The server capabilities from the session object, or null if not connected */
    readonly serverCapabilities: Readonly<JMAPServerCapabilities> | null;

    /** The accounts from the session object, or null if not connected */
    readonly accounts: Readonly<Record<Id, JMAPAccount>> | null;

    /** The primary accounts from the session object */
    readonly primaryAccounts: Readonly<Partial<Record<JMAPCapability, Id>>>;

    /** The username from the session object */
    readonly username: string | null;

    // URL getters
    /** The API URL for JMAP API requests */
    readonly apiUrl: string | null;

    /** The download URL template */
    readonly downloadUrl: string | null;

    /** The upload URL template */
    readonly uploadUrl: string | null;

    /** The event source URL template */
    readonly eventSourceUrl: string | null;

    // Capability registry
    /** Get the capability registry for the client */
    readonly capabilityRegistry: CapabilityRegistryInterface;

    // Configuration methods (chainable)
    /** Set the hostname for the JMAP server */
    withHostname(hostname: string): this;

    /** Set the port for the JMAP server */
    withPort(port: number): this;

    /** Set additional headers for requests */
    withHeaders(headers: Headers | Record<string, string>): this;

    /** Set a custom logger for the client */
    withLogger(logger: Logger): this;

    /** Set a custom event emitter for the client */
    withEmitter(emitter: EventEmitterFn): this;

    /** Enable or disable automatic reconnection when session staleness is detected */
    withAutoReconnect(enabled?: boolean): this;

    /** Register new capabilities with the client */
    registerCapabilities(...capabilities: CapabilityDefinition[]): Promise<CapabilityRegistrationResult>;

    // File operations
    /** Download a file from the JMAP server */
    downloadFile(accountId: Id, blobId: Id, name: string, type: string, signal?: AbortSignal): Promise<Blob>;

    /** Upload a file to the JMAP server */
    uploadFile(accountId: Id, file: Blob | ArrayBuffer | File, signal?: AbortSignal): Promise<JMAPUploadResponse>;

    // Request operations
    /** Create a new request builder */
    createRequestBuilder(): T;

    /** Send an API request to the JMAP server */
    sendAPIRequest(
        jmapRequest: T,
        signal?: AbortSignal,
    ): Promise<{
        methodResponses: InvocationList<BaseInvocationArgs>;
        sessionState: string;
        createdIds: IdMap;
    }>;
}

// JMAPClientOptions
export type JMAPClientOptions = Partial<ClientContext> & {
    hostname?: string;
    port?: number;
    headers?: Headers | Record<string, string>;
    autoReconnect?: boolean;
};

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "disconnecting";

export type ClientContext = {
    /** A logger instance for logging errors and information. */
    logger: Logger;

    /** An event emitter instance for emitting events. */
    emitter: EventEmitterFn;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoggerMethod = (message: string, ...optionalParams: any[]) => void;

export type Logger = {
    log: LoggerMethod;
    info: LoggerMethod;
    warn: LoggerMethod;
    error: LoggerMethod;
    debug: LoggerMethod;
};

/**
 * Events emitted by the JMAP client
 */
export interface JMAPClientEvents {
    /**
     * Emitted when the client's connection status changes
     */
    "status-changed": {
        /**
         * The new connection status
         */
        status: string;

        /**
         * The session state, if available
         */
        sessionState: string | null;
    };

    /**
     * Emitted when the session state reported by the server changes
     */
    "session-stale": {
        /**
         * The previous session state
         */
        oldSessionState: string | null;

        /**
         * The new session state
         */
        newSessionState: string;
    };

    /**
     * Emitted when a request-level error occurs (e.g. authentication error, invalid JSON, etc.)
     */
    "request-error": {
        /**
         * The error that occurred
         */
        error: JMAPRequestError;
    };

    /**
     * Emitted when a transport or network error occurs during any kind of request
     */
    "transport-error": {
        /**
         * The error that occurred
         */
        error: unknown;
    };

    /**
     * Emitted when a file upload operation fails
     */
    "upload-error": {
        /**
         * The account ID to which the upload was attempted
         */
        accountId: Id;

        /**
         * The error that occurred during upload
         */
        error: JMAPRequestError;
    };

    /**
     * Emitted when a file download operation fails
     */
    "download-error": {
        /**
         * The account ID from which the download was attempted
         */
        accountId: Id;

        /**
         * The blob ID of the file being downloaded
         */
        blobId: Id;

        /**
         * The error that occurred during download
         */
        error: JMAPRequestError;
    };

    /**
     * Emitted when one or more capabilities fail schema validation.
     *
     * During connection (`context: "connection"`), invalid capabilities are stripped from the
     * frozen session and treated as unsupported.
     *
     * During late registration (`context: "registration"`), capabilities whose schemas fail
     * validation against the existing session are rejected and not registered.
     */
    "invalid-capabilities": {
        /**
         * Whether the validation occurred during initial connection or late registration
         */
        context: "connection" | "registration";

        /**
         * Server capabilities that failed validation
         */
        serverCapabilities: Extract<ServerCapabilityValidationResult, { valid: false }>[];

        /**
         * Account capabilities that failed validation
         */
        accountCapabilities: Extract<AccountCapabilityValidationResult, { valid: false }>[];
    };
}

/**
 * The result of registering capabilities with the client.
 *
 * Contains arrays of server and account capability validation failures.
 * Empty arrays indicate all capabilities were registered successfully.
 */
export type CapabilityRegistrationResult = {
    /** Server capabilities that failed validation and were not registered */
    serverCapabilities: Extract<ServerCapabilityValidationResult, { valid: false }>[];

    /** Account capabilities that failed validation and were not registered */
    accountCapabilities: Extract<AccountCapabilityValidationResult, { valid: false }>[];
};

/**
 * Event names that can be emitted by the JMAP client
 */
export type JMAPClientEventName = keyof JMAPClientEvents;

/**
 * Type-safe event emitter function
 */
export type TypedEventEmitterFn<Events> = <E extends keyof Events>(name: E, payload: Events[E]) => void;

/**
 * A callback function to handle emitting events.
 * @param name The name of the event.
 * @param payload Any data associated with the event.
 *
 * @remarks
 * Applications may use this with the emit function from any Event Emitter library.
 */
export type EventEmitterFn = TypedEventEmitterFn<JMAPClientEvents>;

/**
 * The allowed response types for Transport methods.
 */
export type TransportResponseType = "json" | "blob";

/**
 * Options for Transport requests.
 */
export type TransportRequestOptions = {
    /**
     * Additional HTTP headers to include in the request.
     */
    headers?: Headers;
    /**
     * The expected response type: "json" (default) parses and returns JSON, "blob" returns a Blob (for binary data).
     */
    responseType?: TransportResponseType;
    /**
     * An AbortSignal to allow aborting the request.
     */
    signal?: AbortSignal;
    /**
     * The request body (for POST requests only).
     * - String: For JSON or text data
     * - Blob/File: For binary data like files
     * - ArrayBuffer: For raw binary data
     */
    body?: string | Blob | ArrayBuffer | File;
};

/**
 * An implementation providing HTTP request functionality for GET and POST requests.
 *
 * Implementations are expected to handle authentication and authorisation internally. For example,
 * automatically including `Authorization` headers in the requests with a valid Bearer token.
 *
 * The `responseType` parameter specifies the expected response type:
 * - "json" (default): parses and returns JSON.
 * - "blob": returns a Blob (for binary data).
 */
export type Transport = {
    /**
     * Perform an HTTP GET request to the specified URL with the included options.
     *
     * @param url The URL to request.
     * @param options Additional options for the request (headers, responseType, signal).
     * @returns The parsed response body from a successful request.
     *
     * @throws {TypeError} If parsing the response fails.
     * @throws {JMAPRequestError} For JMAP-specific protocol errors with non-200 status codes
     *   and JSON response bodies conforming to RFC 7807 Problem Details.
     * @throws {Error} For network errors, timeouts, and other request failures.
     */
    get: <T>(url: string | URL, options?: Omit<TransportRequestOptions, "body">) => Promise<T>;

    /**
     * Perform an HTTP POST request to the specified URL with the included options.
     *
     * @param url The URL to request.
     * @param options Additional options for the request (body, headers, responseType, signal).
     * @returns The parsed response body from a successful request.
     *
     * @throws {TypeError} If parsing the response fails.
     * @throws {JMAPRequestError} For JMAP-specific protocol errors with non-200 status codes
     *   and JSON response bodies conforming to RFC 7807 Problem Details.
     * @throws {Error} For network errors, timeouts, and other request failures.
     */
    post: <T>(url: string | URL, options?: TransportRequestOptions) => Promise<T>;
};

export const AccountSchema = z.looseObject({
    name: z.string(),
    isPersonal: z.boolean(),
    isReadOnly: z.boolean(),
    accountCapabilities: JMAPAccountCapabilitiesSchema,
});

/**
 * Account
 *
 * Represents a JMAP account as described in the JMAP Session object.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-1.6.2 RFC 8620 Section 1.6.2 - Accounts}
 */
export type JMAPAccount = {
    /**
     * A user-friendly string to show when presenting content from this account, e.g., the email
     * address representing the owner of the account.
     */
    name: string;

    /**
     * This is true if the account belongs to the authenticated user rather than a group account or
     * a personal account of another user that has been shared with them.
     */
    isPersonal: boolean;

    /**  This is true if the entire account is read-only. */
    isReadOnly: boolean;

    /**
     * The set of capability URIs for the methods supported in this account. Each key is a URI for a
     * capability that has methods you can use with this account. The value for each of these keys
     * is an object with further information about the account’s permissions and restrictions with
     * respect to this capability, as defined in the capability’s specification.
     */
    accountCapabilities: JMAPAccountCapabilities;
};

//JMAPSession
export const JMAPSessionSchema = z.looseObject({
    capabilities: JMAPServerCapabilitiesSchema,
    accounts: z.record(z.string(), AccountSchema),
    primaryAccounts: z.record(z.string(), z.string()),
    username: z.string(),
    apiUrl: z.string(),
    downloadUrl: z.string(),
    uploadUrl: z.string(),
    eventSourceUrl: z.string(),
    state: z.string(),
});

/**
 * JMAPSession
 *
 * The session object returned by the JMAP server's well-known endpoint.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-2 RFC 8620 Section 2 - The JMAP Session Resource}
 */
export type JMAPSession = Readonly<{
    /**
     * An object specifying the capabilities of this server. Each key is a URI for a capability
     * supported by the server. The value for each of these keys is an object with further
     * information about the server’s capabilities in relation to that capability.
     */
    capabilities: JMAPServerCapabilities;

    /**
     * A map of an account id to an Account object for each account the user has access to.
     */
    accounts: Record<Id, JMAPAccount>;

    /**
     * A map of capability URIs (as found in accountCapabilities) to the account id that is
     * considered to be the user’s main or default account for data pertaining to that capability.
     * If no account being returned belongs to the user, or in any other way there is no
     * appropriate way to determine a default account, there MAY be no entry for a particular URI,
     * even though that capability is supported by the server (and in the capabilities object).
     * `urn:ietf:params:jmap:core` SHOULD NOT be present.
     */
    primaryAccounts: Partial<Record<JMAPCapabilityUri, Id>>;

    /**
     * The username associated with the given credentials, or the empty string if none.
     */
    username: string;

    /** The URL to use for JMAP API requests. */
    apiUrl: string;

    /**
     * The URL endpoint to use when downloading files, in URI Template (level 1) format
     * {@link https://www.rfc-editor.org/rfc/rfc6570.html RFC 6570}. The URL MUST contain variables called
     * `accountId`, `blobId`, `type`, and `name`.
     *
     * Due to potential encoding issues with slashes in content types, it is RECOMMENDED to put the
     * type variable in the query section of the URL.
     */
    downloadUrl: string;

    /**
     * The URL endpoint to use when uploading files, in URI Template (level 1) format
     * {@link https://www.rfc-editor.org/rfc/rfc6570.html RFC 6570}. The URL MUST contain a variable
     * called `accountId`.
     */
    uploadUrl: string;

    /**
     * The URL to connect to for push events, as described in Section 7.3, in URI Template (level 1)
     * format {@link https://www.rfc-editor.org/rfc/rfc6570.html RFC 6570}. The URL MUST contain variables
     * called `types`, `closeafter`, and `ping`.
     */
    eventSourceUrl: string;

    /**
     * A (preferably short) string representing the state of this object on the server. If the value
     * of any other property on the Session object changes, this string will change. The current
     * value is also returned on the API Response object (see Section 3.4), allowing clients to
     * quickly determine if the session information has changed (e.g., an account has been added
     * or removed), so they need to refetch the object.
     */
    state: string;
}>;

// Use this for runtime validation and type inference only
export type JMAPSessionFromSchema = z.infer<typeof JMAPSessionSchema>;

/**
 * JMAPUploadResponse
 *
 * The response object from a successful file upload operation.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-6.1 RFC 8620 Section 6.1 - Uploading Binary Data}
 */
export type JMAPUploadResponse = {
    /**
     * The id of the account the file was uploaded to.
     */
    accountId: Id;

    /**
     * A unique identifier for the uploaded blob.
     */
    blobId: Id;

    /**
     * The media type of the file, as specified in the Content-Type header.
     */
    type: string;

    /**
     * The size of the file in octets.
     */
    size: number;
};

export type HeadersInit = Exclude<ConstructorParameters<typeof Headers>[0], undefined>;
