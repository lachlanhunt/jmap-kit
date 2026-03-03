import { MaskedEmail } from "./maskedemail.js";

// --- MaskedEmail/get ---

// @ts-expect-error Expected 1 arguments, but got 0
MaskedEmail.request.get();

// @ts-expect-error Type '{}' is missing the following properties: accountId
MaskedEmail.request.get({});

// Only accountId is required
const m1 = MaskedEmail.request.get({
    accountId: "test-id0",
});

// All properties with valid values
MaskedEmail.request.get({
    accountId: "test-id0",
    ids: ["test-id1", "test-id2"],
    properties: [
        "id",
        "email",
        "lastMessageAt",
        "createdAt",
        "createdBy",
        "state",
        "forDomain",
        "description",
        "url",
        "emailPrefix",
    ],
});

// Verify nullable properties
MaskedEmail.request.get({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,

    // Nullable
    ids: null,
    properties: null,
});

// Check all properties accept references
MaskedEmail.request.get({
    accountId: m1.createReference("/accountId"),
    ids: m1.createReference("/ids"),
    properties: m1.createReference("/properties"),
});

MaskedEmail.request.get({
    accountId: "test-id0",
    // @ts-expect-error Type '"FAIL"' is not assignable to type (keyof MaskedEmailObject)
    properties: ["FAIL"],
});

// Assigning invalid types
MaskedEmail.request.get({
    // @ts-expect-error Type 'number' is not assignable to type 'string | ResultReference'
    accountId: 123,
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    ids: "",
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    properties: "",
});

// --- MaskedEmail/set ---

// @ts-expect-error Type '{}' is missing the following properties: accountId
MaskedEmail.request.set({});

// Only accountId is required
MaskedEmail.request.set({
    accountId: "test-id0",
});

// All properties with valid values
MaskedEmail.request.set({
    accountId: "test-id0",
    ifInState: "state",
    create: {
        k1: {
            forDomain: "https://example.com",
            description: "Test masked email",
            state: "enabled",
            url: "https://example.com/account",
            emailPrefix: "test_prefix",
        },
    },
    update: {
        id1: { description: "Updated description" },
    },
    destroy: ["id2"],
});

// Verify nullable properties
MaskedEmail.request.set({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,

    // Nullable
    ifInState: null,
    create: null,
    update: null,
    destroy: null,
});

// Check all properties accept references
MaskedEmail.request.set({
    accountId: m1.createReference("/accountId"),
    ifInState: m1.createReference("/ifInState"),
    create: m1.createReference("/create"),
    update: m1.createReference("/update"),
    destroy: m1.createReference("/destroy"),
});
