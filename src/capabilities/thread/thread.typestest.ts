import { Thread } from "./thread.js";

// @ts-expect-error Expected 1 arguments, but got 0
Thread.request.get();

// @ts-expect-error Type '{}' is missing the following properties: accountId
Thread.request.get({});

// Only accountId is required
const m1 = Thread.request.get({
    accountId: "test-id0",
});

// All properties with valid values
Thread.request.get({
    accountId: "test-id0",
    ids: ["test-id1", "test-id2"],
    properties: ["id", "emailIds"],
});

// Verify nullable properties
Thread.request.get({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,

    // Nullable
    ids: null,
    properties: null,
});

// Check all properties accept references
Thread.request.get({
    accountId: m1.createReference("/accountId"),
    ids: m1.createReference("/ids"),
    properties: m1.createReference("/properties"),
});

Thread.request.get({
    accountId: "test-id0",
    // @ts-expect-error Type '"FAIL"' is not assignable to type (keyof ThreadObject)
    properties: ["FAIL"],
});

// Assigning invalid types
Thread.request.get({
    // @ts-expect-error Type 'number' is not assignable to type 'string | ResultReference'
    accountId: 123,
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    ids: "",
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    properties: "",
});

// @ts-expect-error Type '{}' is missing the following properties: accountId, sinceState
Thread.request.changes({});

// @ts-expect-error Type '{}' is missing the following properties: sinceState
Thread.request.changes({ accountId: "test-id0" });

// @ts-expect-error Type '{}' is missing the following properties: accountId
Thread.request.changes({ sinceState: "state" });

// Only accountId and sinceState are required
Thread.request.changes({
    accountId: "test-id0",
    sinceState: "state",
});

// All properties with valid values
Thread.request.changes({
    accountId: "test-id0",
    sinceState: "state",
    maxChanges: 3,
});

// Verify nullable properties
Thread.request.changes({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    sinceState: null,

    // Nullable
    maxChanges: null,
});

// Check all properties accept references
Thread.request.changes({
    accountId: m1.createReference("/accountId"),
    sinceState: m1.createReference("/state"),
    maxChanges: m1.createReference("/maxChanges"),
});
