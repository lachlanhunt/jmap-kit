import { describe, expect, it } from "vitest";
import { mergeHeaders } from "./merge-headers.js";

describe("mergeHeaders", () => {
    it("should merge Headers with no conflicts", () => {
        const h1 = new Headers({
            "content-type": "application/json",
            "x-custom": "value1",
        });
        const h2 = new Headers({
            accept: "application/json",
            "x-other": "value2",
        });

        const result = mergeHeaders(h1, h2);

        expect(result.get("content-type")).toBe("application/json");
        expect(result.get("x-custom")).toBe("value1");
        expect(result.get("accept")).toBe("application/json");
        expect(result.get("x-other")).toBe("value2");
    });

    it("should override single-value headers from h2", () => {
        const h1 = new Headers({
            "content-type": "text/plain",
            authorization: "Bearer token1",
        });
        const h2 = new Headers({
            "content-type": "application/json",
            authorization: "Bearer token2",
        });

        const result = mergeHeaders(h1, h2);

        expect(result.get("content-type")).toBe("application/json");
        expect(result.get("authorization")).toBe("Bearer token2");
    });

    it("should combine multi-value headers without duplicates", () => {
        const h1 = new Headers({
            accept: "text/html, application/xml",
            "x-tags": "tag1, tag2",
        });
        const h2 = new Headers({
            accept: "application/json, text/html",
            "x-tags": "tag2, tag3",
        });

        const result = mergeHeaders(h1, h2);

        expect(result.get("accept")).toBe("text/html, application/xml, application/json");
        expect(result.get("x-tags")).toBe("tag1, tag2, tag3");
    });

    it("should handle case-sensitive header names", () => {
        const h1 = new Headers({
            "Content-Type": "text/plain",
            "X-Custom": "value1",
        });
        const h2 = new Headers({
            "content-type": "application/json",
            "x-custom": "value2",
        });

        const result = mergeHeaders(h1, h2);

        // Headers are case-insensitive for retrieval
        expect(result.get("Content-Type")).toBe("application/json");
        expect(result.get("X-Custom")).toBe("value1, value2");
    });

    it("should handle empty headers", () => {
        const h1 = new Headers();
        const h2 = new Headers({
            "content-type": "application/json",
        });

        const merged = mergeHeaders(h1, h2);
        expect(merged.get("content-type")).toBe("application/json");

        const emptyMerged = mergeHeaders(new Headers(), h2);
        expect(emptyMerged.get("content-type")).toBe("application/json");
    });

    it("should merge headers from array of arrays", () => {
        const h1: [string, string][] = [
            ["content-type", "text/plain"],
            ["x-custom", "value1"],
            ["accept", "text/html"],
        ];
        const h2: [string, string][] = [
            ["content-type", "application/json"],
            ["x-custom", "value2"],
            ["accept", "application/xml"],
        ];

        const result = mergeHeaders(h1, h2);

        expect(result.get("content-type")).toBe("application/json");
        expect(result.get("x-custom")).toBe("value1, value2");
        expect(result.get("accept")).toBe("text/html, application/xml");
    });

    it("should merge headers from record objects", () => {
        const h1 = {
            "content-type": "text/plain",
            "x-custom": "value1",
            accept: "text/html",
        };
        const h2 = {
            "content-type": "application/json",
            "x-custom": "value2",
            accept: "application/xml",
        };

        const result = mergeHeaders(h1, h2);

        expect(result.get("content-type")).toBe("application/json");
        expect(result.get("x-custom")).toBe("value1, value2");
        expect(result.get("accept")).toBe("text/html, application/xml");
    });

    it("should merge mixed header formats", () => {
        const h1: [string, string][] = [
            ["content-type", "text/plain"],
            ["x-custom", "value1"],
        ];
        const h2 = {
            "content-type": "application/json",
            "x-tags": "tag1, tag2",
        };

        const result = mergeHeaders(h1, h2);

        expect(result.get("content-type")).toBe("application/json");
        expect(result.get("x-custom")).toBe("value1");
        expect(result.get("x-tags")).toBe("tag1, tag2");
    });

    it("should handle pre-split multi-value headers in record format", () => {
        const h1 = {
            accept: "text/html, application/xml",
            "x-tags": "tag1,tag2",
        };
        const h2 = {
            accept: "application/json",
            "x-tags": " tag2, tag3 ",
        };

        const result = mergeHeaders(h1, h2);

        expect(result.get("accept")).toBe("text/html, application/xml, application/json");
        expect(result.get("x-tags")).toBe("tag1, tag2, tag3");
    });
});
