import type { HTTPDigestAlgorithmValues, Id, UnsignedInt } from "../../common/types.js";
import type { BaseGetRequestInvocationArgs, BaseGetResponseInvocationArgs, SetError } from "../../invocation/types.js";

/**
 * Specifies the encoding format for blob data (text or base64)
 */
export type BlobDataFormat = "asText" | "asBase64";

/**
 * Partial record of digest values for a blob, keyed by digest algorithm
 */
export type BlobObjectDigest = Partial<Record<`digest:${HTTPDigestAlgorithmValues}`, string>>;

/**
 * Partial record of blob data in various formats (raw data, asText, or asBase64)
 */
export type BlobObjectData = Partial<Record<"data" | `data:${BlobDataFormat}`, string>>;

/**
 * The size of a blob in octets
 */
export type BlobObjectSize = {
    size?: UnsignedInt;
};

/**
 * A Blob object represents binary data managed by the server
 */
export type BlobObject = BlobObjectDigest & BlobObjectData & BlobObjectSize;

/**
 * The arguments to copy Blob objects via a `Blob/copy` call
 */
export type BlobCopyRequestInvocationArgs = {
    // Note Blob/copy requests do not share properties with the common BaseCopyRequestInvocationArgs

    /** The accountId of the account to copy the blobs to */
    accountId: Id;

    /** The accountId of the account to copy the blobs from */
    fromAccountId: Id;

    /** The blobIds to copy */
    blobIds: Id[];
};

export type BlobCopyResponseInvocationArgs = {
    // Note Blob/copy responses do not share properties with the common BaseCopyResponseInvocationArgs

    /** The id of the account blobs were copied from. */
    fromAccountId: Id;

    /** The id of the account blobs were copied to. */
    accountId: Id;

    /**
     * A map of the blobId in the fromAccount to the id for the blob in the account it was copied
     * to, or null if none were successfully copied.
     */
    copied: Record<Id, Id> | null;

    /**
     * A map of blobId to a SetError object for each blob that failed to be copied, or null if none.
     */
    notCopied: Record<Id, SetError<"create", "notFound">> | null;
};

/**
 * The object representing the blob of data being uploaded
 */
export type UploadObject = {
    /**
     * An array of zero or more octet sources in order (zero to create an empty blob).
     * The result of each of these sources is concatenated together in order to create the blob.
     */
    data: DataSourceObject[];

    /** (default: null) Hint for media type of the data */
    type?: string | null;
};

/**
 * A source of octets to use in creating a blob
 */
export type DataSourceObject =
    | {
          /** The raw octets, must be UTF-8 */
          "data:asText": string | null;
      }
    | {
          /** The base64 representation of octets */
          "data:asBase64": string | null;
      }
    | {
          /** The blobId to copy from */
          blobId: Id;

          /** (default: 0) The number of octets offset into the referenced blob */
          offset?: UnsignedInt | null;

          /** (default: remaining octets in the blog) The length of data to copy from the referenced blob */
          length?: UnsignedInt | null;
      };

export type DataCreatedObject = {
    /** The blobId that was created. */
    id: Id;

    /**
     * The media type as given in the creation (if any). If not provided, the server MAY perform
     * content analysis and return one of the following: the calculated value, `application/octet-string`,
     * or `null`. */
    type: string | null;

    /** The size of the created blob in octets. */
    size: UnsignedInt;
};

/**
 * The arguments for fetching Blob objects via a `Blob/get` call
 */
export type BlobGetRequestInvocationArgs = BaseGetRequestInvocationArgs<BlobObject> & {
    /** (default: 0) Start this many octets into the blob data */
    offset?: UnsignedInt | null;

    /**
     * (default: all remaining octets) Return at most this many octets of the blob data.
     * If null or unspecified, then all remaining octets in the blob are returned. This can be
     * considered equivalent to an infinitely large length value, except that the isTruncated
     * warning is not given unless the start offset is past the end of the blob.
     */
    length?: UnsignedInt | null;
};

/**
 * The response to a `Blob/get` call
 */
export type BlobGetResponseInvocationArgs = Omit<BaseGetResponseInvocationArgs<Omit<BlobObject, "data">>, "state"> & {
    /** (default: false) */
    isEncodingProblem: boolean;

    /** (default: false) */
    isTruncated: boolean;
};

/**
 * The arguments for uploading Blob objects via a `Blob/upload` call
 */
export type BlobUploadRequestInvocationArgs = {
    /** The accountId of the account to upload the blob to */
    accountId: Id;

    /** The blobs to upload */
    create: {
        [id: string]: UploadObject;
    };
};

/**
 * The response to a `Blob/upload` call
 */
export type BlobUploadResponseInvocationArgs = {
    /** The id of the account used for the call. */
    accountId: Id;

    /**
     * The state string that would have been returned by Foo/get before making the requested
     * changes, or null if the server doesn’t know what the previous state string was.
     */
    oldState?: string | null;

    /** The state string that will now be returned by Foo/get. */
    newState: string;

    /**
     * A map of the creation id to an object containing any properties of the created Foo object
     * that were not sent by the client. This includes all server-set properties (such as the id in
     * most object types) and any properties that were omitted by the client and thus set to a
     * default by the server.
     *
     * This argument is null if no Foo objects were successfully created.
     */
    created?: Record<Id, DataCreatedObject> | null;

    /**
     * A map of the creation id to a SetError object for each record that failed to be created, or
     * null if all successful.
     */
    notCreated?: Record<Id, SetError<"create">> | null;
};

/**
 * The arguments for looking up blobs via the Blob/lookup method
 */
export type BlobLookupRequestInvocationArgs = {
    /** The accountId of the account to lookup the blobs in */
    accountId: Id;

    /** A list of names from the "JMAP Data Types" registry, or defined by private extensions which the client has requested. Only names for which "Can reference blobs" is true may be specified, and the capability which defines each type must also be used by the overall JMAP request in which this method is called.If a type name is not known by the server, or the associated capability has not been requested, then the server returns an "unknownDataType" error. */
    typeNames: string[];

    /** A list of blobId values to be looked for. */
    ids: Id[];

    /** A list of BlobInfo objects. */
    list: BlobInfo[];
};

/**
 * The response to a `Blob/lookup` call
 */
export type BlobLookupResponseInvocationArgs = {
    /** A list of BlobInfo objects. */
    list: BlobInfo[];
};

// BlobInfo
export type BlobInfo = {
    /** The Blob Identifier. */
    id: Id;

    /**
     * A map from type name to list of Ids of that data type (e.g. the name "Email" maps to a list of emailIds)
     * If a blob is not visible to a user, or does not exist on the server at all, then the server MUST still
     * return an empty array for each type as this doesn't leak any information about whether the blob is on the
     * server but not visible to the requesting user.
     */
    matchedIds: Record<string, Id[]>;
};

/**
 * Union type of all Blob capability request invocation arguments
 */
export type BlobRequestInvocationArgs =
    | BlobCopyRequestInvocationArgs
    | BlobGetRequestInvocationArgs
    | BlobUploadRequestInvocationArgs
    | BlobLookupRequestInvocationArgs;

/**
 * Union type of all Blob capability response invocation arguments
 */
export type BlobResponseInvocationArgs =
    | BlobCopyResponseInvocationArgs
    | BlobGetResponseInvocationArgs
    | BlobUploadResponseInvocationArgs
    | BlobLookupResponseInvocationArgs;
