import { Email } from "./email.js";

// --- Email/get ---

// @ts-expect-error Expected 1 arguments, but got 0
Email.request.get();

// @ts-expect-error Type '{}' is missing the following properties: accountId
Email.request.get({});

// Only accountId is required
const m1 = Email.request.get({
    accountId: "test-id0",
});

// All properties with valid values
Email.request.get({
    accountId: "test-id0",
    ids: ["test-id1", "test-id2"],
    properties: [
        "id",
        "blobId",
        "threadId",
        "size",
        "headers",
        "hasAttachment",
        "preview",
        "mailboxIds",
        "keywords",
        "receivedAt",
        "messageId",
        "inReplyTo",
        "references",
        "sender",
        "from",
        "to",
        "cc",
        "bcc",
        "replyTo",
        "subject",
        "sentAt",
        "bodyStructure",
        "bodyValues",
        "textBody",
        "htmlBody",
        "attachments",
    ],
    bodyProperties: ["partId", "blobId", "size", "type"],
    fetchTextBodyValues: true,
    fetchHTMLBodyValues: true,
    fetchAllBodyValues: false,
    maxBodyValueBytes: 256,
});

// Verify nullable properties
Email.request.get({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,

    // Nullable
    ids: null,
    properties: null,
});

// Check all properties accept references
Email.request.get({
    accountId: m1.createReference("/accountId"),
    ids: m1.createReference("/ids"),
    properties: m1.createReference("/properties"),
});

Email.request.get({
    accountId: "test-id0",
    // @ts-expect-error Type '"FAIL"' is not assignable to type (keyof EmailObject)
    properties: ["FAIL"],
});

// Assigning invalid types
Email.request.get({
    // @ts-expect-error Type 'number' is not assignable to type 'string | ResultReference'
    accountId: 123,
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    ids: "",
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    properties: "",
});

// --- Email/changes ---

// @ts-expect-error Type '{}' is missing the following properties: accountId, sinceState
Email.request.changes({});

// @ts-expect-error Type '{}' is missing the following properties: sinceState
Email.request.changes({ accountId: "test-id0" });

// @ts-expect-error Type '{}' is missing the following properties: accountId
Email.request.changes({ sinceState: "state" });

// Only accountId and sinceState are required
Email.request.changes({
    accountId: "test-id0",
    sinceState: "state",
});

// All properties with valid values
Email.request.changes({
    accountId: "test-id0",
    sinceState: "state",
    maxChanges: 3,
});

// Verify nullable properties
Email.request.changes({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    sinceState: null,

    // Nullable
    maxChanges: null,
});

// Check all properties accept references
Email.request.changes({
    accountId: m1.createReference("/accountId"),
    sinceState: m1.createReference("/state"),
    maxChanges: m1.createReference("/maxChanges"),
});

// --- Email/set ---

// @ts-expect-error Type '{}' is missing the following properties: accountId
Email.request.set({});

// Only accountId is required
Email.request.set({
    accountId: "test-id0",
});

// All properties with valid values
Email.request.set({
    accountId: "test-id0",
    ifInState: "state",
    create: {
        k1: {
            mailboxIds: { "inbox-id": true },
            keywords: { $draft: true },
            bodyStructure: { type: "text/plain", size: 10, headers: [] },
            bodyValues: {},
            textBody: [],
            htmlBody: [],
            attachments: [],
        },
    },
    update: {
        id1: { "keywords/$seen": true },
    },
    destroy: ["id2"],
});

// Verify nullable properties
Email.request.set({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,

    // Nullable
    ifInState: null,
    create: null,
    update: null,
    destroy: null,
});
