import type { Mocked } from "vitest";
import { vi } from "vitest";
import type { CapabilityRegistryInterface } from "../capability-registry/types.js";
import { CORE_CAPABILITY_URI } from "../common/registry.js";
import type { Id, JMAPServerCapabilities, UnsignedInt } from "../common/types.js";
import type { JMAPAccount, JMAPClientInterface } from "../jmap-client/types.js";
import type { RequestBuilder } from "./request-builder.js";
import type { DeepPartial } from "./types.js";

/**
 * Default server capabilities for testing
 */
export const DEFAULT_CORE_CAPABILITIES: JMAPServerCapabilities[CORE_CAPABILITY_URI] = {
    maxCallsInRequest: 4,
    maxObjectsInGet: 10,
    maxSizeUpload: 2500,
    maxSizeRequest: 10000,
    maxConcurrentRequests: 10,
    maxConcurrentUpload: 10,
    maxObjectsInSet: 15,
    collationAlgorithms: ["i;ascii-numeric", "i;ascii-casemap", "i;octet"],
};

/**
 * Default server capabilities for testing
 */
export const DEFAULT_SERVER_CAPABILITIES: JMAPServerCapabilities = {
    [CORE_CAPABILITY_URI]: DEFAULT_CORE_CAPABILITIES,
};

function hasOwnProperty<T extends object>(obj: T, key: PropertyKey): key is keyof T {
    return Object.hasOwn(obj, key);
}

/**
 * Deep merges two objects recursively, with values from the source object overriding
 * values in the target object. Functions, arrays, and null values are copied directly
 * rather than being deep-merged.
 *
 * @param target The target object to merge into
 * @param source The source object with values to merge
 * @returns A new object with the merged values
 */
function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
    // Create a new object to avoid modifying the originals
    let result = { ...target };

    // Process each property in the source object
    for (const key of Object.keys(source) as (keyof T)[]) {
        if (!hasOwnProperty(source, key)) {
            // Skip properties that are not directly on the source object
            continue;
        }

        const sourceValue = source[key];

        // Skip undefined values
        if (sourceValue === undefined) {
            continue;
        }

        const targetValue = target[key];
        let replacementValue: T[keyof T];

        // Handle non-objects, null values, functions, and arrays with direct copy
        if (
            sourceValue === null ||
            Array.isArray(sourceValue) ||
            typeof sourceValue !== "object" ||
            targetValue === null ||
            targetValue === undefined ||
            typeof targetValue !== "object" ||
            Array.isArray(targetValue)
        ) {
            replacementValue = sourceValue as T[keyof T];
        }
        // Both are objects, merge them recursively
        else {
            replacementValue = deepMerge(targetValue, sourceValue as DeepPartial<T[keyof T]>);
        }

        // Update the result object with the replacement value
        result = {
            ...result,
            [key]: replacementValue,
        };
    }

    return result;
}

/**
 * Creates a mock client for testing the RequestBuilder class with support
 * for arbitrary nested object overrides.
 *
 * @param overrides Optional partial overrides for the mock client properties
 * @returns A mocked JMAPClientInterface
 */
export function createMockClient(
    overrides: DeepPartial<JMAPClientInterface<RequestBuilder>> = {},
): Mocked<JMAPClientInterface<RequestBuilder>> {
    // Create a mock capability registry
    const mockCapabilityRegistry: Mocked<CapabilityRegistryInterface> = {
        register: vi.fn().mockReturnValue(true),
        has: vi.fn().mockReturnValue(true),
        get: vi.fn(),
        getAll: vi.fn().mockReturnValue([]),
        getValidatorsByHook: vi.fn().mockReturnValue([]),
        getTransformersByHook: vi.fn().mockReturnValue([]),
        getInvocationFactoryByDataType: vi.fn(),
        getInvocationRequestFactory: vi.fn(),
        getInvocationResponseFactory: vi.fn(),
        executeValidators: vi.fn(),
        executeBuildTransformers: vi.fn(),
        executeSerializationTransformers: vi.fn(),
        validateServerCapabilities: vi.fn().mockResolvedValue([]),
        validateAccountCapabilities: vi.fn().mockResolvedValue([]),
        validateCapabilityDefinition: vi.fn().mockResolvedValue({ serverCapabilities: [], accountCapabilities: [] }),
    };

    // Start with a fresh default client object
    const defaultClient: Mocked<JMAPClientInterface<RequestBuilder>> = {
        // Connection management
        connectionStatus: "connected",
        connect: vi.fn(),
        disconnect: vi.fn(),

        // Session and capabilities
        serverCapabilities: DEFAULT_SERVER_CAPABILITIES,
        accounts: null,
        primaryAccounts: {},
        username: null,

        // URL getters
        apiUrl: null,
        downloadUrl: null,
        uploadUrl: null,
        eventSourceUrl: null,

        // Configuration methods
        withHostname: vi.fn().mockReturnThis(),
        withPort: vi.fn().mockReturnThis(),
        withHeaders: vi.fn().mockReturnThis(),
        withLogger: vi.fn().mockReturnThis(),
        withEmitter: vi.fn().mockReturnThis(),
        withAutoReconnect: vi.fn().mockReturnThis(),

        // File operations
        downloadFile: vi.fn(),
        uploadFile: vi.fn(),

        // Request operations
        createRequestBuilder: vi.fn(),
        sendAPIRequest: vi.fn(),

        // Capability registry
        capabilityRegistry: mockCapabilityRegistry,
        registerCapabilities: vi.fn().mockReturnThis(),
    };

    // Merge the overrides into the default client
    return deepMerge(defaultClient, overrides);
}

/**
 * Creates a mock client with no server capabilities.
 *
 * @returns A mocked JMAPClientInterface with null serverCapabilities
 */
export function createMockClientWithoutCapabilities(): Mocked<JMAPClientInterface<RequestBuilder>> {
    return createMockClient({ serverCapabilities: null });
}

/**
 * Creates a mock client with a specific maxCallsInRequest limit.
 *
 * @param maxCallsInRequest The maximum number of calls allowed in a request
 * @returns A mocked JMAPClientInterface with the specified maxCallsInRequest limit
 */
export function createMockClientWithMaxCalls(
    maxCallsInRequest: UnsignedInt,
): Mocked<JMAPClientInterface<RequestBuilder>> {
    return createMockClient({
        serverCapabilities: {
            [CORE_CAPABILITY_URI]: {
                maxCallsInRequest,
            },
        },
    });
}

/**
 * Creates a mock client with both serverCapabilities and accounts populated,
 * enabling validation plugins to run during serialize().
 *
 * @returns A mocked JMAPClientInterface with accounts
 */
export function createMockClientWithAccounts(): Mocked<JMAPClientInterface<RequestBuilder>> {
    const accounts: Record<Id, JMAPAccount> = {
        account1: {
            name: "Test Account",
            isPersonal: true,
            isReadOnly: false,
            accountCapabilities: {
                [CORE_CAPABILITY_URI]: {},
            },
        },
    };

    return createMockClient({ accounts });
}
