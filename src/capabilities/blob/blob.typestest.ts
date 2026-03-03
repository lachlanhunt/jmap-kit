import { Blob } from "./blob.js";

// --- Blob/copy ---

// @ts-expect-error Expected 1 arguments, but got 0
Blob.request.copy();

// @ts-expect-error Type '{}' is missing the following properties: accountId, fromAccountId, blobIds
Blob.request.copy({});

// All required properties
const m1 = Blob.request.copy({
    accountId: "dest-account",
    fromAccountId: "source-account",
    blobIds: ["blob-id1", "blob-id2"],
});

// Verify nullable properties
Blob.request.copy({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    fromAccountId: null,
    // @ts-expect-error Type 'null' is not assignable to type 'ResultReference | string[]'
    blobIds: null,
});

// Check all properties accept references
Blob.request.copy({
    accountId: m1.createReference("/accountId"),
    fromAccountId: m1.createReference("/fromAccountId"),
    blobIds: m1.createReference("/blobIds"),
});

// --- Blob/get ---

// @ts-expect-error Expected 1 arguments, but got 0
Blob.request.get();

// @ts-expect-error Type '{}' is missing the following properties: accountId
Blob.request.get({});

// Only accountId is required
Blob.request.get({
    accountId: "test-id0",
});

// All properties with valid values
Blob.request.get({
    accountId: "test-id0",
    ids: ["blob-id1"],
    properties: ["size"],
    offset: 0,
    length: 1024,
});

// Verify nullable properties
Blob.request.get({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,

    // Nullable
    ids: null,
    properties: null,
    offset: null,
    length: null,
});

// --- Blob/upload ---

// @ts-expect-error Expected 1 arguments, but got 0
Blob.request.upload();

// @ts-expect-error Type '{}' is missing the following properties: accountId, create
Blob.request.upload({});

// All required properties
Blob.request.upload({
    accountId: "test-id0",
    create: {
        k1: {
            data: [{ "data:asText": "hello world" }],
            type: "text/plain",
        },
    },
});

// Upload with base64 data source
Blob.request.upload({
    accountId: "test-id0",
    create: {
        k1: {
            data: [{ "data:asBase64": "aGVsbG8=" }],
        },
    },
});

// Upload with blobId source
Blob.request.upload({
    accountId: "test-id0",
    create: {
        k1: {
            data: [{ blobId: "existing-blob", offset: 10, length: 100 }],
        },
    },
});

// --- Blob/lookup ---

// @ts-expect-error Expected 1 arguments, but got 0
Blob.request.lookup();

// @ts-expect-error Type '{}' is missing the following properties: accountId, typeNames, ids, list
Blob.request.lookup({});

// All required properties
Blob.request.lookup({
    accountId: "test-id0",
    typeNames: ["Email", "Thread"],
    ids: ["blob-id1"],
    list: [{ id: "blob-id1", matchedIds: { Email: ["email-id1"] } }],
});
