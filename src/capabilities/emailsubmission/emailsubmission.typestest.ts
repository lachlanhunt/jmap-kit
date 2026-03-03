import { EmailSubmission } from "./emailsubmission.js";

// @ts-expect-error Expected 1 arguments, but got 0
EmailSubmission.request.get();

// @ts-expect-error Type '{}' is missing the following properties: accountId
EmailSubmission.request.get({});

// Only accountId is required
const m1 = EmailSubmission.request.get({
    accountId: "test-id0",
});

// All properties with valid values
EmailSubmission.request.get({
    accountId: "test-id0",
    ids: ["test-id1", "test-id2"],
    properties: [
        "id",
        "identityId",
        "emailId",
        "threadId",
        "envelope",
        "sendAt",
        "undoStatus",
        "deliveryStatus",
        "dsnBlobIds",
        "mdnBlobIds",
    ],
});

// Verify nullable properties
EmailSubmission.request.get({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,

    // Nullable
    ids: null,
    properties: null,
});

// Check all properties accept references
EmailSubmission.request.get({
    accountId: m1.createReference("/accountId"),
    ids: m1.createReference("/ids"),
    properties: m1.createReference("/properties"),
});

EmailSubmission.request.get({
    accountId: "test-id0",
    // @ts-expect-error Type '"FAIL"' is not assignable to type (keyof EmailSubmissionObject)
    properties: ["FAIL"],
});

// Assigning invalid types
EmailSubmission.request.get({
    // @ts-expect-error Type 'number' is not assignable to type 'string | ResultReference'
    accountId: 123,
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    ids: "",
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    properties: "",
});

// @ts-expect-error Type '{}' is missing the following properties: accountId, sinceState
EmailSubmission.request.changes({});

// @ts-expect-error Type '{}' is missing the following properties: sinceState
EmailSubmission.request.changes({ accountId: "test-id0" });

// @ts-expect-error Type '{}' is missing the following properties: accountId
EmailSubmission.request.changes({ sinceState: "state" });

// Only accountId and sinceState are required
EmailSubmission.request.changes({
    accountId: "test-id0",
    sinceState: "state",
});

// All properties with valid values
EmailSubmission.request.changes({
    accountId: "test-id0",
    sinceState: "state",
    maxChanges: 3,
});

// Verify nullable properties
EmailSubmission.request.changes({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    sinceState: null,

    // Nullable
    maxChanges: null,
});

// Check all properties accept references
EmailSubmission.request.changes({
    accountId: m1.createReference("/accountId"),
    sinceState: m1.createReference("/state"),
    maxChanges: m1.createReference("/maxChanges"),
});

// @ts-expect-error Type '{}' is missing the following properties: accountId
EmailSubmission.request.set({});

// Only accountId is required
EmailSubmission.request.set({
    accountId: "test-id0",
});

// All properties with valid values including onSuccess* args
EmailSubmission.request.set({
    accountId: "test-id0",
    ifInState: "state",
    create: {
        k1: {
            identityId: "identity-id",
            emailId: "email-id",
            envelope: {
                mailFrom: { email: "sender@example.com" },
                rcptTo: [{ email: "recipient@example.com" }],
            },
        },
    },
    update: {
        id1: { undoStatus: "canceled" },
    },
    destroy: ["id2"],
    onSuccessUpdateEmail: {
        "#k1": { "mailboxIds/drafts": null, "mailboxIds/sent": true, "keywords/$draft": null },
    },
    onSuccessDestroyEmail: ["#k1"],
});
