import { BLOB_CAPABILITY_URI, CORE_CAPABILITY_URI } from "../../common/registry.js";
import type { JMAPCapability, JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "../../invocation/types.js";
import type {
    BlobCopyRequestInvocationArgs,
    BlobCopyResponseInvocationArgs,
    BlobGetRequestInvocationArgs,
    BlobGetResponseInvocationArgs,
    BlobLookupRequestInvocationArgs,
    BlobLookupResponseInvocationArgs,
    BlobRequestInvocationArgs,
    BlobResponseInvocationArgs,
    BlobUploadRequestInvocationArgs,
    BlobUploadResponseInvocationArgs,
} from "./types.js";

/**
 * BlobInvocation represents a JMAP Blob capability invocation.
 *
 * The Blob data type handles binary data management with methods for copying, uploading,
 * retrieving, and looking up binary data across accounts. The Blob/copy method is part
 * of the Core capability (RFC 8620), while upload/get/lookup are part of the Blob
 * Management Extension (RFC 9404).
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-6.3 | RFC 8620 Section 6.3: Blob/copy}
 * @see {@link https://www.rfc-editor.org/rfc/rfc9404.html#section-4 | RFC 9404 Section 4: Blob Methods}
 */
export class BlobInvocation<
    TArgs extends BlobRequestInvocationArgs | BlobResponseInvocationArgs,
> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        if (this.name === "Blob/copy") {
            return CORE_CAPABILITY_URI;
        }
        return BLOB_CAPABILITY_URI;
    }

    /**
     * Constructs a BlobInvocation
     *
     * @param method The name of the method being invoked (e.g., "copy", "upload", "get", "lookup")
     * @param args The arguments for the method invocation
     * @param methodCallId An optional unique symbol to identify this method call for result referencing
     */
    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("Blob", method, args, methodCallId);
    }

    /**
     * Create an invocation factory function
     *
     * @param method The name of the method to create
     * @returns A new Blob invocation factory function for creating invocations of the specified type
     */
    static createInvocationFactory<TArgs extends BlobRequestInvocationArgs | BlobResponseInvocationArgs>(
        method: JMAPMethodName,
    ): InvocationFactory<TArgs, BlobInvocation<TArgs>> {
        /**
         * An invocation factory function to create a `Blob/*` invocation for the specified `method`
         *
         * @param args The invocation arguments for the specified `method`
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns An object representing the named arguments for the specified `method`
         */
        return (args, methodCallId) => new BlobInvocation<TArgs>(method, args, methodCallId);
    }
}

export const Blob = {
    request: {
        /**
         * Copies a Blob from one account to another.
         *
         * @param args The invocation arguments for Blob/copy
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A BlobInvocation representing the Blob/copy request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc8620.html#section-6.3 | RFC 8620 Section 6.3: Blob/copy}
         */
        copy: BlobInvocation.createInvocationFactory<BlobCopyRequestInvocationArgs>("copy"),
        /**
         * Retrieves binary data by blob ID with optional range and encoding support.
         *
         * @param args The invocation arguments for Blob/get
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A BlobInvocation representing the Blob/get request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc9404.html#section-4.2 | RFC 9404 Section 4.2: Blob/get}
         */
        get: BlobInvocation.createInvocationFactory<BlobGetRequestInvocationArgs>("get"),
        /**
         * Uploads binary data and returns the blob ID.
         *
         * @param args The invocation arguments for Blob/upload
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A BlobInvocation representing the Blob/upload request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc9404.html#section-4.1 | RFC 9404 Section 4.1: Blob/upload}
         */
        upload: BlobInvocation.createInvocationFactory<BlobUploadRequestInvocationArgs>("upload"),
        /**
         * Looks up blob IDs by their data type and account.
         *
         * @param args The invocation arguments for Blob/lookup
         * @param methodCallId An optional unique symbol to identify this method call for result referencing
         * @returns A BlobInvocation representing the Blob/lookup request
         *
         * @see {@link https://www.rfc-editor.org/rfc/rfc9404.html#section-4.3 | RFC 9404 Section 4.3: Blob/lookup}
         */
        lookup: BlobInvocation.createInvocationFactory<BlobLookupRequestInvocationArgs>("lookup"),
    },
    response: {
        copy: BlobInvocation.createInvocationFactory<BlobCopyResponseInvocationArgs>("copy"),
        get: BlobInvocation.createInvocationFactory<BlobGetResponseInvocationArgs>("get"),
        upload: BlobInvocation.createInvocationFactory<BlobUploadResponseInvocationArgs>("upload"),
        lookup: BlobInvocation.createInvocationFactory<BlobLookupResponseInvocationArgs>("lookup"),
    },
} satisfies InvocationFactoryCollection;
