import { SearchSnippet } from "./searchsnippet.js";

// @ts-expect-error Expected 1 arguments, but got 0
SearchSnippet.request.get();

// @ts-expect-error Type '{}' is missing the following properties: accountId, emailIds
SearchSnippet.request.get({});

// @ts-expect-error Type '{}' is missing the following properties: emailIds
SearchSnippet.request.get({ accountId: "test-id0" });

// accountId and emailIds are required
const m1 = SearchSnippet.request.get({
    accountId: "test-id0",
    emailIds: ["email-id1", "email-id2"],
});

// All properties with valid values
SearchSnippet.request.get({
    accountId: "test-id0",
    filter: { text: "search term" },
    emailIds: ["email-id1"],
});

// Filter with operator
SearchSnippet.request.get({
    accountId: "test-id0",
    filter: {
        operator: "AND",
        conditions: [{ text: "foo" }, { subject: "bar" }],
    },
    emailIds: ["email-id1"],
});

// Verify nullable properties
SearchSnippet.request.get({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,
    // @ts-expect-error Type 'null' is not assignable to type 'ResultReference | string[]'
    emailIds: null,

    // Nullable
    filter: null,
});

// Check all properties accept references
SearchSnippet.request.get({
    accountId: m1.createReference("/accountId"),
    filter: m1.createReference("/filter"),
    emailIds: m1.createReference("/emailIds"),
});

// Assigning invalid types
SearchSnippet.request.get({
    // @ts-expect-error Type 'number' is not assignable to type 'string | ResultReference'
    accountId: 123,
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[]'
    emailIds: "",
});
