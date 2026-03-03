import { Identity } from "./identity.js";

// @ts-expect-error Expected 1 arguments, but got 0
Identity.request.get();

// @ts-expect-error Type '{}' is missing the following properties: accountId
Identity.request.get({});

// Only accountId is required
const m1 = Identity.request.get({
    accountId: "test-id0",
});

// All properties with valid values
Identity.request.get({
    accountId: "test-id0",
    ids: ["test-id1", "test-id2"],
    properties: ["id", "mayDelete", "name", "email", "replyTo", "bcc", "textSignature", "htmlSignature"],
});

// Verify nullable properties
Identity.request.get({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,

    // Nullable
    ids: null,
    properties: null,
});

// Check all properties accept references
Identity.request.get({
    accountId: m1.createReference("/accountId"),
    ids: m1.createReference("/ids"),
    properties: m1.createReference("/properties"),
});

Identity.request.get({
    accountId: "test-id0",
    // @ts-expect-error Type '"FAIL"' is not assignable to type (keyof IdentityObject)
    properties: ["FAIL"],
});

// Assigning invalid types
Identity.request.get({
    // @ts-expect-error Type 'number' is not assignable to type 'string | ResultReference'
    accountId: 123,
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    ids: "",
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    properties: "",
});

// @ts-expect-error Type '{}' is missing the following properties: accountId, sinceState
Identity.request.changes({});

// @ts-expect-error Type '{}' is missing the following properties: sinceState
Identity.request.changes({ accountId: "test-id0" });

// @ts-expect-error Type '{}' is missing the following properties: accountId
Identity.request.changes({ sinceState: "state" });

// Only accountId and sinceState are required
Identity.request.changes({
    accountId: "test-id0",
    sinceState: "state",
});

// All properties with valid values
Identity.request.changes({
    accountId: "test-id0",
    sinceState: "state",
    maxChanges: 3,
});

// Verify nullable properties
Identity.request.changes({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    sinceState: null,

    // Nullable
    maxChanges: null,
});

// Check all properties accept references
Identity.request.changes({
    accountId: m1.createReference("/accountId"),
    sinceState: m1.createReference("/state"),
    maxChanges: m1.createReference("/maxChanges"),
});

// @ts-expect-error Type '{}' is missing the following properties: accountId
Identity.request.set({});

// Only accountId is required
Identity.request.set({
    accountId: "test-id0",
});

// All properties with valid values
Identity.request.set({
    accountId: "test-id0",
    ifInState: "state",
    create: {
        k1: {
            email: "user@example.com",
            name: "Test User",
            replyTo: [{ name: "Test", value: "reply@example.com" }],
            bcc: [{ value: "bcc@example.com" }],
            textSignature: "-- \nSent from JMAP",
            htmlSignature: "<p>Sent from JMAP</p>",
        },
    },
    update: {
        id1: { name: "Updated Name" },
    },
    destroy: ["id2"],
});

// Verify nullable properties
Identity.request.set({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,

    // Nullable
    ifInState: null,
    create: null,
    update: null,
    destroy: null,
});

// Check all properties accept references
Identity.request.set({
    accountId: m1.createReference("/accountId"),
    ifInState: m1.createReference("/ifInState"),
    create: m1.createReference("/create"),
    update: m1.createReference("/update"),
    destroy: m1.createReference("/destroy"),
});
