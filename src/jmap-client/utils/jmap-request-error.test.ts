import { describe, expect, it } from "vitest";
import { LIMIT, NOT_JSON, NOT_REQUEST, UNKNOWN_CAPABILITY } from "../../common/registry.js";
import { JMAPRequestError } from "./jmap-request-error.js";

describe("JMAPRequestError", () => {
    describe("constructor", () => {
        it("should create an error with the provided detail message", () => {
            const errorResponse = {
                type: UNKNOWN_CAPABILITY,
                detail: "Server does not support the XYZ capability",
                status: 400,
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(JMAPRequestError);
            expect(error.message).toBe("Server does not support the XYZ capability");
            expect(error.type).toBe(UNKNOWN_CAPABILITY);
            expect(error.status).toBe(400);
            expect(error.problemDetails).toEqual(errorResponse);
            expect(error.name).toBe("JMAPRequestError");
        });

        it("should fallback to title if detail is not provided", () => {
            const errorResponse = {
                type: NOT_JSON,
                title: "Invalid JSON",
                status: 400,
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error.message).toBe("Invalid JSON");
        });

        it("should fallback to default message for known error types if detail and title are not provided", () => {
            const errorResponse = {
                type: NOT_REQUEST,
                status: 400,
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error.message).toBe("The request did not match the required JMAP request format");
        });

        it("should handle LIMIT error type with additional limit property", () => {
            const errorResponse = {
                type: LIMIT,
                status: 400,
                limit: "maxCallsInRequest",
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error.message).toBe("The request exceeded a server-defined limit");
            expect(error.problemDetails["limit"]).toBe("maxCallsInRequest");
        });

        it("should fallback to type URI if no detail, title, or default message is available", () => {
            // Use a non-standard error type for testing
            const customErrorType = "urn:example:custom-error" as const;
            const errorResponse = {
                type: customErrorType,
                status: 400,
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error.message).toBe(customErrorType);
        });
    });

    describe("each error type", () => {
        it("should handle UNKNOWN_CAPABILITY error", () => {
            const errorResponse = {
                type: UNKNOWN_CAPABILITY,
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error.type).toBe(UNKNOWN_CAPABILITY);
            expect(error.message).toBe("The request included a capability that the server does not support");
        });

        it("should handle NOT_JSON error", () => {
            const errorResponse = {
                type: NOT_JSON,
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error.type).toBe(NOT_JSON);
            expect(error.message).toBe("The request was not valid JSON or had an incorrect Content-Type");
        });

        it("should handle NOT_REQUEST error", () => {
            const errorResponse = {
                type: NOT_REQUEST,
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error.type).toBe(NOT_REQUEST);
            expect(error.message).toBe("The request did not match the required JMAP request format");
        });

        it("should handle LIMIT error", () => {
            const errorResponse = {
                type: LIMIT,
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error.type).toBe(LIMIT);
            expect(error.message).toBe("The request exceeded a server-defined limit");
        });
    });

    describe("additional properties", () => {
        it("should preserve all properties from the error response", () => {
            const errorResponse = {
                type: LIMIT,
                status: 429,
                title: "Too Many Requests",
                detail: "You have exceeded the rate limit",
                instance: "/problems/rate-limit",
                limit: "maxRequestsPerMinute",
                retryAfter: 60,
                customProperty: "custom value",
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error.problemDetails).toEqual(errorResponse);
            expect(error.problemDetails.instance).toBe("/problems/rate-limit");
            expect(error.problemDetails["retryAfter"]).toBe(60);
            expect(error.problemDetails["customProperty"]).toBe("custom value");
        });
    });

    describe("error inheritance", () => {
        it("should inherit from Error", () => {
            const errorResponse = {
                type: NOT_JSON,
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(JMAPRequestError);
        });

        it("should have a correct stack trace", () => {
            const errorResponse = {
                type: NOT_JSON,
            } as const;

            const error = new JMAPRequestError(errorResponse);

            expect(error.stack).toBeDefined();
            expect(error.stack).toContain("JMAPRequestError");
        });
    });
});
