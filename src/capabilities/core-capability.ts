import { z } from "zod/v4";
import type { CapabilityDefinition, ValidationPlugin } from "../capability-registry/types.js";
import { CORE_CAPABILITY_URI } from "../common/registry.js";
import type { EmptyObject, UnsignedInt } from "../common/types.js";
import type {
    BaseFilterCondition,
    BaseGetRequestInvocationArgs,
    BaseInvocationArgs,
    BaseObject,
    BaseQueryRequestInvocationArgs,
    BaseSetRequestInvocationArgs,
} from "../invocation/types.js";
import { Blob } from "./blob/blob.js";
import type { BlobCopyRequestInvocationArgs } from "./blob/types.js";
import { Core } from "./core/core.js";
import { assertInvocationMethod } from "./utils/assert-invocation-method.js";
import { createReadOnlyAccountValidator } from "./utils/create-readonly-account-validator.js";

const MEGABYTE = 1_000_000; // 1 MB in bytes

/**
 * Validates that `/get` method calls do not exceed the server's `maxObjectsInGet` limit.
 *
 * **Object Retrieval Limits (RFC 8620 Section 5.1):**
 * - Enforces the `maxObjectsInGet` limit defined in the Core capability object
 * - This limit applies to the `ids` array in any `/get` method call (`Mailbox/get`, `Email/get`, etc.)
 * - Prevents requests that would be rejected by the server with a `requestTooLarge` error
 * - The server defines this limit based on resource constraints and performance characteristics
 *
 * This validation catches oversized requests client-side before transmission, providing
 * immediate feedback and avoiding unnecessary network traffic.
 *
 * **Example:**
 * If a server sets `maxObjectsInGet: 500`, attempting to fetch 1000 email IDs in a single
 * `Email/get` call would be caught and reported by this validator.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-5.1 | RFC 8620 Section 5.1: /get}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-2 | RFC 8620 Section 2: The JMAP Session Resource}

 */
export const maxObjectsInGetPlugin: ValidationPlugin<"invocation", BaseGetRequestInvocationArgs<BaseInvocationArgs>> = {
    name: "core-max-objects-in-get",
    hook: "invocation",
    trigger: {
        method: "get",
    },
    validate(context) {
        const { serverCapabilities, invocation } = context;

        assertInvocationMethod(invocation, "get");

        const coreCapability = serverCapabilities[CORE_CAPABILITY_URI];
        const ids = invocation.getArgument("ids");

        if (ids && ids.length > coreCapability.maxObjectsInGet) {
            return {
                valid: false,
                errors: [
                    new Error(
                        `Request contains ${ids.length} objects, but server limit is ${coreCapability.maxObjectsInGet}`,
                    ),
                ],
            };
        }

        return { valid: true };
    },
};

/**
 * Validates that `/set` method calls do not exceed the server's `maxObjectsInSet` limit.
 *
 * **Object Modification Limits (RFC 8620 Section 5.3):**
 * - Enforces the `maxObjectsInSet` limit defined in the Core capability object
 * - Counts the total number of operations across `create`, `update`, and `destroy` arguments
 * - Applies to all `/set` method calls (`Mailbox/set`, `Email/set`, etc.)
 * - Prevents requests that would be rejected with a `requestTooLarge` error
 * - The server defines this limit to manage transaction size and resource usage
 *
 * This validation catches oversized batch operations client-side before transmission,
 * allowing clients to split large operations into multiple requests if needed.
 *
 * **Example:**
 * If a server sets `maxObjectsInSet: 100`, attempting to create 50 mailboxes, update 30,
 * and delete 25 (total: 105 operations) in a single `Mailbox/set` call would be rejected.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-5.3 | RFC 8620 Section 5.3: /set}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-2 | RFC 8620 Section 2: The JMAP Session Resource}

 */
export const maxObjectsInSetPlugin: ValidationPlugin<"invocation", BaseSetRequestInvocationArgs<BaseInvocationArgs>> = {
    name: "core-max-objects-in-set",
    hook: "invocation",
    trigger: {
        method: "set",
    },
    validate(context) {
        const { serverCapabilities, invocation } = context;

        assertInvocationMethod(invocation, "set");

        const coreCapability = serverCapabilities[CORE_CAPABILITY_URI];
        const create = invocation.getArgument("create");
        const update = invocation.getArgument("update");
        const destroy = invocation.getArgument("destroy");

        const totalObjects =
            (create ? Object.keys(create).length : 0) +
            (update ? Object.keys(update).length : 0) +
            (destroy ? destroy.length : 0);

        if (totalObjects > coreCapability.maxObjectsInSet) {
            return {
                valid: false,
                errors: [
                    new Error(
                        `Request contains ${totalObjects} operations, but server limit is ${coreCapability.maxObjectsInSet}`,
                    ),
                ],
            };
        }

        return { valid: true };
    },
};

/**
 * Validates that `/query` method calls only use server-supported collation algorithms.
 *
 * **Collation Algorithm Support (RFC 8620 Section 5.5):**
 * - Validates that any `collation` property in sort criteria is included in the server's
 *   `collationAlgorithms` capability list
 * - Collation algorithms control how strings are compared and sorted (case sensitivity,
 *   locale-specific ordering, accent handling, etc.)
 * - Common algorithms include "i;ascii-casemap" (case-insensitive ASCII) and "i;unicode-casemap"
 * - Server support varies based on implementation and internationalisation capabilities
 *
 * This validation prevents query errors by catching unsupported collation algorithms before
 * sending the request. Without this check, the server would reject the query with an
 * `unsupportedSort` error.
 *
 * **Example:**
 * If a server only supports "i;ascii-casemap" collation, attempting to sort with
 * "i;unicode-casemap" would be caught and reported by this validator.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-5.5 | RFC 8620 Section 5.5: /query}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-2 | RFC 8620 Section 2: The JMAP Session Resource}

 */
export const collationAlgorithmsPlugin: ValidationPlugin<
    "invocation",
    BaseQueryRequestInvocationArgs<BaseInvocationArgs, BaseFilterCondition>
> = {
    name: "core-collation-algorithms",
    hook: "invocation",
    trigger: {
        method: "query",
    },
    validate(context) {
        const { serverCapabilities, invocation } = context;

        assertInvocationMethod(invocation, "query");

        const coreCapability = serverCapabilities[CORE_CAPABILITY_URI];
        const sort = invocation.getArgument("sort") as { property: string; collation?: string }[] | undefined;

        if (sort) {
            const errors: Error[] = [];

            for (const sortCriterion of sort) {
                if (sortCriterion.collation && !coreCapability.collationAlgorithms.includes(sortCriterion.collation)) {
                    errors.push(
                        new Error(
                            `Unsupported collation algorithm '${sortCriterion.collation}'. Supported algorithms: ${coreCapability.collationAlgorithms.join(", ")}`,
                        ),
                    );
                }
            }

            if (errors.length > 0) {
                return {
                    valid: false,
                    errors,
                };
            }
        }

        return { valid: true };
    },
};

/**
 * Prevents `/set` method calls on read-only accounts.
 *
 * **Read-Only Account Protection (RFC 8620 Section 1.6.2, Section 5.3):**
 * - Validates that the target account's `isReadOnly` property is `false`
 * - Read-only accounts cannot accept any data modification operations
 * - All `/set` methods (create, update, destroy) require write access
 * - Attempting modifications on read-only accounts would fail with an `accountReadOnly` error
 *
 * This validator catches the error client-side before making a server request, providing
 * immediate feedback when attempting invalid operations on read-only accounts.
 *
 * **Common read-only scenarios:**
 * - Shared resources with read-only permissions
 * - Archive or backup accounts
 * - Accounts in maintenance mode
 * - Delegated access with restricted permissions
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-5.3 | RFC 8620 Section 5.3: /set}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-2 | RFC 8620 Section 2: The JMAP Session Resource}

 */
export const preventSetOnReadOnlyAccountPlugin: ValidationPlugin<
    "invocation",
    BaseSetRequestInvocationArgs<BaseObject>
> = createReadOnlyAccountValidator<BaseSetRequestInvocationArgs<BaseObject>>({
    name: "core-prevent-set-on-readonly-account",
    trigger: {
        method: "set",
    },
});

/**
 * Validates that API requests do not exceed the server's `maxCallsInRequest` limit.
 *
 * **Request Batching Limits (RFC 8620 Section 3.2):**
 * - Enforces the `maxCallsInRequest` limit defined in the Core capability object
 * - This limit applies to the total number of method calls in the `methodCalls` array
 * - JMAP allows batching multiple method calls in a single request for efficiency
 * - Prevents requests that would be rejected with a `requestTooLarge` error
 * - The server defines this limit to manage request processing complexity and resources
 *
 * This validation runs during the `pre-build` lifecycle hook, checking the request structure
 * before serialisation. It catches oversized batches early, allowing clients to split large
 * batches into multiple API requests.
 *
 * **Example:**
 * If a server sets `maxCallsInRequest: 50`, attempting to batch 75 method calls
 * (e.g., Email/get + 50 Email/set + 24 Mailbox/get) would be caught by this validator.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-3.2 | RFC 8620 Section 3.2: Making an API Request}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-2 | RFC 8620 Section 2: The JMAP Session Resource}

 */
export const maxCallsInRequestPlugin: ValidationPlugin<"pre-build"> = {
    name: "core-max-calls-in-request",
    hook: "pre-build",
    trigger: {},
    validate(context) {
        const {
            serverCapabilities,
            data: { methodCalls },
        } = context;

        const { maxCallsInRequest } = serverCapabilities[CORE_CAPABILITY_URI];

        if (methodCalls.length > maxCallsInRequest) {
            return {
                valid: false,
                errors: [
                    new Error(
                        `Request contains ${methodCalls.length} methods, but server limit is ${maxCallsInRequest}`,
                    ),
                ],
            };
        }

        return { valid: true };
    },
};

/**
 * Validates that serialised API requests do not exceed the server's `maxSizeRequest` limit.
 *
 * **Request Size Limits (RFC 8620 Section 3.2):**
 * - Enforces the `maxSizeRequest` limit defined in the Core capability object
 * - Measures the total size of the serialised request body in bytes
 * - This limit applies after the request has been serialised (JSON stringified and encoded)
 * - Prevents requests that would be rejected with a `requestTooLarge` error
 * - The server defines this limit based on available memory, bandwidth, and processing capacity
 *
 * This validation runs during the `post-serialization` lifecycle hook, checking the actual
 * wire format size. It handles various body formats (string, Blob, ArrayBuffer) and provides
 * human-readable error messages in megabytes.
 *
 * **Example:**
 * If a server sets `maxSizeRequest: 10000000` (10 MB), attempting to send a request with
 * a large Email/import containing 15 MB of email data would be caught and reported as
 * "Request size (15.00 MB) exceeds server limit of 10.00 MB".
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-3.2 | RFC 8620 Section 3.2: Making an API Request}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-2 | RFC 8620 Section 2: The JMAP Session Resource}

 */
export const maxSizeRequestPlugin: ValidationPlugin<"post-serialization"> = {
    name: "core-max-size-request",
    hook: "post-serialization",
    trigger: {},
    async validate(context) {
        const {
            serverCapabilities,
            data: { body },
        } = context;
        const { maxSizeRequest } = serverCapabilities[CORE_CAPABILITY_URI];

        // Forward-compatibility: serialize() always produces a string body; Blob and ArrayBuffer
        // paths exist for custom post-serialization transformers.
        let inputData: Uint8Array;
        if (typeof body === "string") {
            const encoder = new TextEncoder();
            inputData = encoder.encode(body);
            /* v8 ignore start */
            /* istanbul ignore else */
        } else if (body instanceof globalThis.Blob) {
            /* istanbul ignore next */
            inputData = new Uint8Array(await body.arrayBuffer());
            /* istanbul ignore else */
        } else {
            inputData = new Uint8Array(body);
        }
        /* v8 ignore stop */

        const requestSize = inputData.length;

        if (requestSize > maxSizeRequest) {
            const sizeInMB = (requestSize / MEGABYTE).toFixed(2);
            const maxSizeInMB = (maxSizeRequest / MEGABYTE).toFixed(2);

            return {
                valid: false,
                errors: [new Error(`Request size (${sizeInMB} MB) exceeds server limit of ${maxSizeInMB} MB`)],
            };
        }

        return {
            valid: true,
        };
    },
};

/**
 * Prevents Blob/copy operations on read-only target accounts.
 *
 * **Read-Only Account Protection for Blob/copy:**
 * - Validates that the target account's (accountId) `isReadOnly` property is `false`
 * - Blob/copy writes blobs to the target account, requiring write access
 * - The source account (fromAccountId) only needs read access
 * - Attempting to copy to a read-only account would fail with an `accountReadOnly` error
 *
 * This validator catches the error client-side before making a server request, providing
 * immediate feedback when attempting to copy blobs to read-only accounts.
 *
 * **Common read-only scenarios:**
 * - Shared accounts with read-only permissions
 * - Archive or backup accounts
 * - Accounts in maintenance mode
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-6.3 | RFC 8620 Section 6.3: Blob/copy}

 */
export const preventBlobCopyOnReadOnlyAccountPlugin: ValidationPlugin<"invocation", BlobCopyRequestInvocationArgs> =
    createReadOnlyAccountValidator<BlobCopyRequestInvocationArgs>({
        name: "core-prevent-blob-copy-on-readonly-account",
        trigger: {
            dataType: "Blob",
            method: "copy",
        },
    });

const coreServerCapabilitySchema = z.looseObject({
    maxSizeUpload: z.number().int().min(0),
    maxConcurrentUpload: z.number().int().min(1),
    maxSizeRequest: z.number().int().min(0),
    maxConcurrentRequests: z.number().int().min(0),
    maxCallsInRequest: z.number().int().min(0),
    maxObjectsInGet: z.number().int().min(0),
    maxObjectsInSet: z.number().int().min(0),
    collationAlgorithms: z.array(z.string()),
});

/**
 * Defines the Core capability, including Core/echo and Blob/copy invocations
 * and validation plugins.
 */
export const CoreCapability = {
    uri: CORE_CAPABILITY_URI,
    invocations: {
        Core,
        Blob: {
            request: {
                copy: Blob.request.copy,
            },
            response: {
                copy: Blob.response.copy,
            },
        },
    },
    validators: [
        maxObjectsInGetPlugin,
        maxObjectsInSetPlugin,
        collationAlgorithmsPlugin,
        preventSetOnReadOnlyAccountPlugin,
        preventBlobCopyOnReadOnlyAccountPlugin,
        maxCallsInRequestPlugin,
        maxSizeRequestPlugin,
    ],
    schema: { serverCapability: coreServerCapabilitySchema },
} satisfies CapabilityDefinition;

declare module "../common/types.js" {
    interface ServerCapabilityRegistry {
        [CORE_CAPABILITY_URI]: {
            /**
             * The maximum file size, in octets, that the server will accept for a single file upload
             * (for any purpose). Suggested minimum: 50,000,000.
             */
            maxSizeUpload: UnsignedInt;

            /**
             * The maximum number of concurrent requests the server will accept to the upload endpoint.
             * Suggested minimum: 4.
             */
            maxConcurrentUpload: UnsignedInt;

            /**
             * The maximum size, in octets, that the server will accept for a single request to the API
             * endpoint. Suggested minimum: 10,000,000.
             */
            maxSizeRequest: UnsignedInt;

            /**
             * The maximum number of concurrent requests the server will accept to the API endpoint.
             * Suggested minimum: 4.
             */
            maxConcurrentRequests: UnsignedInt;

            /**
             * The maximum number of method calls the server will accept in a single request to the API
             * endpoint. Suggested minimum: 16.
             */
            maxCallsInRequest: UnsignedInt;

            /**
             * The maximum number of objects that the client may request in a single /get type method
             * call. Suggested minimum: 500.
             */
            maxObjectsInGet: UnsignedInt;

            /**
             * The maximum number of objects the client may send to create, update, or destroy in a
             * single /set type method call. This is the combined total, e.g., if the maximum is 10, you
             * could not create 7 objects and destroy 6, as this would be 13 actions, which exceeds the
             * limit. Suggested minimum: 500.
             */
            maxObjectsInSet: UnsignedInt;

            /**
             * A list of identifiers for algorithms registered in the collation registry, as defined in
             * {@link https://www.rfc-editor.org/rfc/rfc4790.html RFC 4790}, that the server supports for
             * sorting when querying records.
             */
            collationAlgorithms: string[];
        };
    }
    interface AccountCapabilityRegistry {
        "urn:ietf:params:jmap:core": EmptyObject;
    }
}
