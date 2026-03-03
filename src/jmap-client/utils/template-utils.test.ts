import { describe, expect, it } from "vitest";
import { expandUrlWithParams, extractTemplateVariables } from "./template-utils.js";

describe("Template Utilities", () => {
    describe("extractTemplateVariables", () => {
        it("should extract simple variable names", () => {
            const template = "https://api.example.com/jmap/upload/{accountId}/";
            const expected = new Set(["accountId"]);
            expect(extractTemplateVariables(template)).toEqual(expected);
        });

        it("should extract variables from query templates", () => {
            const template = "https://api.example.com/jmap/upload/{?accountId}";
            const expected = new Set(["accountId"]);
            expect(extractTemplateVariables(template)).toEqual(expected);
        });

        it("should extract multiple variables", () => {
            const template = "https://api.example.com/jmap/download/{accountId}/{blobId}/{name}?type={type}";
            const extracted = extractTemplateVariables(template);
            expect(extracted).toContain("accountId");
            expect(extracted).toContain("blobId");
            expect(extracted).toContain("name");
            expect(extracted).toContain("type");
            expect(extracted.size).toBe(4);
        });

        it("should handle complex templates with different operators", () => {
            const template = "{+path}/items{/segments}{.ext}{;params}{?query,queryList*}{&continuation}";
            const expected = ["path", "segments", "ext", "params", "query", "queryList", "continuation"];

            const extracted = extractTemplateVariables(template);
            expected.forEach((variable) => {
                expect(extracted).toContain(variable);
            });
            expect(extracted.size).toBe(expected.length);
        });

        it("should handle modifiers correctly", () => {
            const template = "{var}{var:2}{var*}{+var}";
            const expected = new Set(["var"]);
            expect(extractTemplateVariables(template)).toEqual(expected);
        });
    });

    describe("expandUrlWithParams", () => {
        it("should expand a template with parameters", () => {
            const template = "https://api.example.com/jmap/upload/{accountId}/";
            const url = expandUrlWithParams(template, { accountId: "a123" });
            expect(url.toString()).toBe("https://api.example.com/jmap/upload/a123/");
        });

        it("should append unused parameters as query params", () => {
            const template = "https://api.example.com/jmap/upload/";
            const url = expandUrlWithParams(template, { accountId: "a123" });
            expect(url.toString()).toBe("https://api.example.com/jmap/upload/?accountId=a123");
        });

        it("should handle query parameter templates", () => {
            const template = "https://api.example.com/jmap/upload/{?accountId}";
            const url = expandUrlWithParams(template, { accountId: "a123" });
            expect(url.toString()).toBe("https://api.example.com/jmap/upload/?accountId=a123");
        });

        it("should handle mixed parameters (some in template, some not)", () => {
            const template = "https://api.example.com/jmap/download/{accountId}/{blobId}";
            const url = expandUrlWithParams(template, {
                accountId: "a123",
                blobId: "b456",
                name: "document.pdf",
                type: "application/pdf",
            });
            expect(url.toString()).toBe(
                "https://api.example.com/jmap/download/a123/b456?name=document.pdf&type=application%2Fpdf",
            );
        });

        it("should handle numeric values", () => {
            const template = "https://api.example.com/jmap/event/{types}";
            const url = expandUrlWithParams(template, {
                types: "Email",
                ping: 300,
            });
            expect(url.toString()).toBe("https://api.example.com/jmap/event/Email?ping=300");
        });

        it("should handle boolean values", () => {
            const template = "https://api.example.com/jmap/resource/{resourceId}";
            const url = expandUrlWithParams(template, {
                resourceId: "r123",
                active: true,
                deleted: false,
            });
            expect(url.toString()).toBe("https://api.example.com/jmap/resource/r123?active=true&deleted=false");
        });

        it("should not add null values to the URL", () => {
            const template = "https://api.example.com/jmap/resource/{resourceId}";
            const url = expandUrlWithParams(template, {
                resourceId: "r123",
                nullValue: null,
            });
            expect(url.toString()).toBe("https://api.example.com/jmap/resource/r123");
        });
    });
});
