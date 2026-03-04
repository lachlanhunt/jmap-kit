import { z } from "zod/v4";
import type { CapabilityDefinition, ValidationPlugin } from "../capability-registry/types.js";
import { BLOB_CAPABILITY_URI } from "../common/registry.js";
import { Blob } from "./blob/blob.js";
import type {
    BlobCopyRequestInvocationArgs,
    BlobUploadRequestInvocationArgs,
    DataSourceObject,
    HTTPDigestAlgorithm,
} from "./blob/types.js";
import { HTTPDigestAlgorithmSchema } from "./blob/types.js";
import { assertInvocation } from "./utils/assert-invocation.js";
import { createReadOnlyAccountValidator } from "./utils/create-readonly-account-validator.js";

/**
 * Validates that invocations using the Blob capability have a valid accountId that supports the Blob capability.
 *
 * This plugin performs three critical validation checks:
 * 1. Verifies the invocation includes a valid `accountId` argument (non-empty string)
 * 2. Confirms the account exists in the session's accounts collection
 * 3. Ensures the account's `accountCapabilities` includes the Blob capability URI
 *
 * This validation applies to all Blob capability invocations (`Blob/upload`, `Blob/get`, `Blob/lookup`)
 * and implements the account capability checks for the Blob Management Extension (RFC 9404).
 *
 * Note: `Blob/copy` is part of the Core capability and is validated separately in core-capability.ts.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc9404.html | RFC 9404: JMAP Blob Management Extension}
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-1.6.2 | RFC 8620 Section 1.6.2: Accounts}
 */
export const blobAccountSupportPlugin: ValidationPlugin<"invocation"> = {
    name: "blob-account-support",
    hook: "invocation",
    trigger: {
        capabilityUri: BLOB_CAPABILITY_URI,
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
        if (!account.accountCapabilities[BLOB_CAPABILITY_URI]) {
            return {
                valid: false,
                errors: [new Error(`Account "${accountId}" does not support the Blob capability.`)],
            };
        }

        return { valid: true };
    },
};

/**
 * Validates server-defined constraints for Blob/copy operations.
 *
 * This plugin enforces the requirement that Blob/copy operations must copy between
 * different accounts. Attempting to copy blobs within the same account is invalid and would
 * be rejected by the server.
 *
 * **Same-Account Copy Prevention (RFC 8620 Section 6.3):**
 * - Validates that `fromAccountId` and `accountId` are different
 * - `Blob/copy` is designed for cross-account blob sharing
 * - Blobs within the same account are already accessible without copying
 * - Prevents unnecessary server operations and resource usage
 *
 * This validation catches the error client-side before making a server request, providing
 * immediate feedback and avoiding unnecessary network round-trips.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-6.3 | RFC 8620 Section 6.3: Blob/copy}
 */
export const blobCopyValidationPlugin: ValidationPlugin<"invocation", BlobCopyRequestInvocationArgs> = {
    name: "blob-copy-validation",
    hook: "invocation",
    trigger: {
        dataType: "Blob",
        method: "copy",
    },
    validate(context) {
        const { invocation, accounts } = context;

        assertInvocation(invocation, "Blob", "copy");

        const accountId = invocation.getArgument("accountId");
        const fromAccountId = invocation.getArgument("fromAccountId");

        if (accountId === fromAccountId) {
            return {
                valid: false,
                errors: [new Error(`Cannot copy blobs to the same account. fromAccountId and accountId must differ.`)],
            };
        }

        // Validate both accounts exist
        const errors: Error[] = [];
        if (!accounts[accountId]) {
            errors.push(new Error(`Account "${accountId}" does not exist.`));
        }
        if (!accounts[fromAccountId]) {
            errors.push(new Error(`Account "${fromAccountId}" does not exist.`));
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        return { valid: true };
    },
};

/**
 * Calculates the total size in octets for an array of DataSourceObjects.
 * Returns null if the size cannot be calculated (e.g., when referencing external blobs).
 */
function calculateDataSourceSize(data: DataSourceObject[]): number | null {
    let totalSize = 0;

    for (const source of data) {
        if ("data:asText" in source && source["data:asText"] !== null) {
            // UTF-8 encoded text
            totalSize += new TextEncoder().encode(source["data:asText"]).length;
        } else if ("data:asBase64" in source && source["data:asBase64"] !== null) {
            // Base64 encoded data (decode to get actual size)
            const base64 = source["data:asBase64"];
            // Each base64 group of 4 chars represents 3 bytes
            // Remove padding characters to calculate accurate size
            const paddingChars = (base64.match(/=/g) ?? []).length;
            totalSize += (base64.length * 3) / 4 - paddingChars;
        } else /* ("blobId" in source) */ {
            // Referenced blob - we can't validate size without knowing the blob size
            // Server will validate this
            return null;
        }
    }

    return totalSize;
}

/**
 * Validates a single blob upload against account limits.
 */
function validateBlobUpload(
    creationId: string,
    uploadObject: unknown,
    maxDataSources: number,
    maxSizeBlobSet: number | null,
): Error[] {
    const errors: Error[] = [];

    const data = (uploadObject as { data?: DataSourceObject[] }).data;
    if (!Array.isArray(data)) {
        return errors;
    }

    // Check data source count
    if (data.length > maxDataSources) {
        errors.push(
            new Error(`Blob "${creationId}" has ${data.length} data sources, but account limit is ${maxDataSources}`),
        );
    }

    // Check blob size if maxSizeBlobSet is set
    if (maxSizeBlobSet !== null) {
        const totalSize = calculateDataSourceSize(data);

        if (totalSize !== null && totalSize > maxSizeBlobSet) {
            const sizeInKB = (totalSize / 1000).toFixed(2);
            const maxSizeInKB = (maxSizeBlobSet / 1000).toFixed(2);
            errors.push(
                new Error(`Blob "${creationId}" size (${sizeInKB} KB) exceeds account limit of ${maxSizeInKB} KB`),
            );
        }
    }

    return errors;
}

/**
 * Validates server-defined constraints for `Blob/upload` operations.
 *
 * This plugin enforces account-specific blob creation limits defined in the Blob capability:
 *
 * **Blob Size Limit (RFC 9404 Section 4.1):**
 * - Validates that the total blob size does not exceed `maxSizeBlobSet` octets
 * - The limit is server-defined and specified in the account's Blob capability object
 * - If `maxSizeBlobSet` is null, no client-side size limit is enforced
 * - Calculates size from all DataSourceObjects (literal data and referenced blobs)
 * - Note: For referenced blobs, size validation requires the client to know the blob sizes
 *
 * **Data Source Count Limit (RFC 9404 Section 4.1):**
 * - Validates that the number of DataSourceObjects does not exceed `maxDataSources`
 * - Servers MUST support at least 64 DataSourceObjects per creation
 * - This limit prevents excessive resource usage during blob concatenation
 *
 * These validations catch client errors before sending requests to the server, providing
 * immediate feedback and avoiding unnecessary network round-trips. Note that servers may
 * still reject uploads for other reasons (disk space, rate limits, etc.).
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc9404.html#section-4.1 | RFC 9404 Section 4.1: Blob/upload}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9404.html#section-2 | RFC 9404 Section 2: Addition to the Capabilities Object}
 */
export const blobUploadValidationPlugin: ValidationPlugin<"invocation", BlobUploadRequestInvocationArgs> = {
    name: "blob-upload-validation",
    hook: "invocation",
    trigger: {
        dataType: "Blob",
        method: "upload",
    },
    validate(context) {
        const { invocation, accounts } = context;

        assertInvocation(invocation, "Blob", "upload");

        const accountId = invocation.getArgument("accountId");
        const account = accounts[accountId];
        if (!account) {
            return {
                valid: false,
                errors: [new Error(`Account "${accountId}" does not exist.`)],
            };
        }

        const blobCapability = account.accountCapabilities[BLOB_CAPABILITY_URI];
        if (!blobCapability) {
            return {
                valid: false,
                errors: [new Error(`Account "${accountId}" does not support the Blob capability.`)],
            };
        }

        const create = invocation.getArgument("create");

        const errors: Error[] = [];
        const { maxSizeBlobSet, maxDataSources } = blobCapability;

        // Validate each blob creation
        for (const [creationId, uploadObject] of Object.entries(create)) {
            const blobErrors = validateBlobUpload(creationId, uploadObject, maxDataSources, maxSizeBlobSet);
            errors.push(...blobErrors);
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        return { valid: true };
    },
};

/**
 * Prevents Blob/upload operations on read-only accounts.
 *
 * **Read-Only Account Protection for Blob/upload:**
 * - Validates that the target account's `isReadOnly` property is `false`
 * - Blob/upload creates new blobs in the account, requiring write access
 * - Attempting to upload to a read-only account would fail with an `accountReadOnly` error
 *
 * This validator catches the error client-side before making a server request, providing
 * immediate feedback when attempting to upload blobs to read-only accounts.
 *
 * **Common read-only scenarios:**
 * - Shared accounts with read-only permissions
 * - Archive or backup accounts
 * - Accounts in maintenance mode
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc9404.html#section-4.1 | RFC 9404 Section 4.1: Blob/upload}
 */
export const preventBlobUploadOnReadOnlyAccountPlugin: ValidationPlugin<"invocation", BlobUploadRequestInvocationArgs> =
    createReadOnlyAccountValidator<BlobUploadRequestInvocationArgs>({
        name: "blob-prevent-upload-on-readonly-account",
        trigger: {
            dataType: "Blob",
            method: "upload",
        },
    });

const blobAccountCapabilitySchema = z.looseObject({
    maxSizeBlobSet: z.number().int().min(0).nullable(),
    maxDataSources: z.number().int().min(1),
    supportedTypeNames: z.array(z.string()),
    supportedDigestAlgorithms: z.array(HTTPDigestAlgorithmSchema),
});

/**
 * Defines the Blob capability, including Blob invocations (except Blob/copy which is in Core)
 * and validation plugins for the Blob Management Extension.
 */
export const BlobCapability = {
    uri: BLOB_CAPABILITY_URI,
    invocations: {
        Blob: {
            request: {
                upload: Blob.request.upload,
                get: Blob.request.get,
                lookup: Blob.request.lookup,
            },
            response: {
                upload: Blob.response.upload,
                get: Blob.response.get,
                lookup: Blob.response.lookup,
            },
        },
    },
    validators: [
        blobAccountSupportPlugin,
        blobCopyValidationPlugin,
        blobUploadValidationPlugin,
        preventBlobUploadOnReadOnlyAccountPlugin,
    ],
    schema: { accountCapability: blobAccountCapabilitySchema },
} satisfies CapabilityDefinition;

declare module "../common/types.js" {
    interface ServerCapabilityRegistry {
        [BLOB_CAPABILITY_URI]?: EmptyObject;
    }
    interface AccountCapabilityRegistry {
        [BLOB_CAPABILITY_URI]?: {
            /**
             * The maximum size of the blob (in octets) that the server will allow to be created
             * (including blobs created by concatenating multiple data sources together).Clients
             * MUST NOT attempt to create blobs larger than this size.If this value is null, then
             * clients are not required to limit the size of the blob they try to create, though
             * servers can always reject creation of blobs regardless of size, e.g., due to lack
             * of disk space or per-user rate limits.
             */
            maxSizeBlobSet: UnsignedInt | null;

            /**
             * The maximum number of DataSourceObjects allowed per creation in a Blob/upload.
             * Servers MUST allow at least 64 DataSourceObjects per creation.
             */
            maxDataSources: UnsignedInt;

            /**
             * An array of data type names that are supported for Blob/lookup. If the server does not
             * support lookups, then this will be the empty list. Note that the supportedTypeNames list
             * may include private types that are not in the "JMAP Data Types" registry defined by this
             * document. Clients MUST ignore type names they do not recognise.
             */
            supportedTypeNames: JMAPDataType[];

            /**
             * An array of supported digest algorithms that are supported for Blob/get. If the server
             * does not support calculating blob digests, then this will be the empty list. Algorithms
             * in this list MUST be present in the "HTTP Digest Algorithm Values" registry defined by
             * {@link https://www.rfc-editor.org/rfc/rfc3230.html RFC 3230}; however, in JMAP, they must be
             * lowercased, e.g., "md5" rather than "MD5".Clients SHOULD prefer algorithms listed earlier
             * in this list.
             */
            supportedDigestAlgorithms: HTTPDigestAlgorithm[];
        };
    }
}
