import { VacationResponse } from "./vacationresponse.js";

// @ts-expect-error Expected 1 arguments, but got 0
VacationResponse.request.get();

// @ts-expect-error Type '{}' is missing the following properties: accountId
VacationResponse.request.get({});

// Only accountId is required
const m1 = VacationResponse.request.get({
    accountId: "test-id0",
});

// All properties with valid values
VacationResponse.request.get({
    accountId: "test-id0",
    ids: ["singleton"],
    properties: ["id", "isEnabled", "fromDate", "toDate", "subject", "textBody", "htmlBody"],
});

// Verify nullable properties
VacationResponse.request.get({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,

    // Nullable
    ids: null,
    properties: null,
});

// Check all properties accept references
VacationResponse.request.get({
    accountId: m1.createReference("/accountId"),
    ids: m1.createReference("/ids"),
    properties: m1.createReference("/properties"),
});

VacationResponse.request.get({
    accountId: "test-id0",
    // @ts-expect-error Type '"FAIL"' is not assignable to type (keyof VacationResponseObject)
    properties: ["FAIL"],
});

// Assigning invalid types
VacationResponse.request.get({
    // @ts-expect-error Type 'number' is not assignable to type 'string | ResultReference'
    accountId: 123,
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    ids: "",
    // @ts-expect-error Type 'string' is not assignable to type 'ResultReference | string[] | null | undefined'
    properties: "",
});

// @ts-expect-error Type '{}' is missing the following properties: accountId
VacationResponse.request.set({});

// Only accountId is required
VacationResponse.request.set({
    accountId: "test-id0",
});

// Update the singleton with all settable properties
VacationResponse.request.set({
    accountId: "test-id0",
    ifInState: "state",
    update: {
        singleton: {
            isEnabled: true,
            fromDate: "2026-03-01T00:00:00Z",
            toDate: "2026-03-15T00:00:00Z",
            subject: "Out of office",
            textBody: "I am on vacation.",
            htmlBody: "<p>I am on vacation.</p>",
        },
    },
});

// Verify nullable properties
VacationResponse.request.set({
    // @ts-expect-error Type 'null' is not assignable to type 'string | ResultReference'
    accountId: null,

    // Nullable
    ifInState: null,
    create: null,
    update: null,
    destroy: null,
});

// Check all properties accept references
VacationResponse.request.set({
    accountId: m1.createReference("/accountId"),
    ifInState: m1.createReference("/ifInState"),
    create: m1.createReference("/create"),
    update: m1.createReference("/update"),
    destroy: m1.createReference("/destroy"),
});
