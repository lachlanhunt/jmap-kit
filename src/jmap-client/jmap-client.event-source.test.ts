import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockTransport } from "./test-utils.js";

describe("JMAPClient event source", () => {
    let client: JMAPClient;
    let mockTransport: ReturnType<typeof createMockTransport>;

    // Create a modified session with eventSourceUrl for testing
    const eventSourceTestSession = {
        ...mockSession,
        eventSourceUrl: "https://api.example.com/jmap/event/{types}",
    };

    beforeEach(() => {
        mockTransport = createMockTransport({
            getResponse: eventSourceTestSession,
        });
        client = new JMAPClient(mockTransport, { hostname: "api.example.com" });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("getEventSourceUrl", () => {
        it("should throw error when client is not connected", () => {
            expect(() => client.getEventSourceUrl(["Email"], "no", 0)).toThrow(
                "Client is not connected to a JMAP server",
            );
        });

        it("should generate the correct URL from template with event types as array", async () => {
            await client.connect();
            const url = client.getEventSourceUrl(["Email"], "no", 0);
            expect(url.toString()).toBe("https://api.example.com/jmap/event/Email?closeafter=no&ping=0");
        });

        it("should generate the correct URL with wildcard types", async () => {
            await client.connect();
            const url = client.getEventSourceUrl("*", "no", 0);
            expect(url.toString()).toBe("https://api.example.com/jmap/event/%2A?closeafter=no&ping=0");
        });

        it("should generate the correct URL from template with multiple event types", async () => {
            await client.connect();
            const url = client.getEventSourceUrl(["Email", "CalendarEvent"], "no", 0);
            expect(url.toString()).toBe(
                "https://api.example.com/jmap/event/Email%2CCalendarEvent?closeafter=no&ping=0",
            );
        });

        it("should add closeafter parameter", async () => {
            await client.connect();
            const url = client.getEventSourceUrl(["Email"], "state", 0);
            expect(url.toString()).toBe("https://api.example.com/jmap/event/Email?closeafter=state&ping=0");
        });

        it("should add ping parameter", async () => {
            await client.connect();
            const url = client.getEventSourceUrl(["Email"], "no", 300);
            expect(url.toString()).toBe("https://api.example.com/jmap/event/Email?closeafter=no&ping=300");
        });

        it("should throw error for negative ping values", async () => {
            await client.connect();
            expect(() => client.getEventSourceUrl(["Email"], "no", -5)).toThrow();
        });

        it("should throw error when eventSourceUrl is missing from session", async () => {
            const badSession = {
                ...eventSourceTestSession,
                eventSourceUrl: "",
            };

            const clientWithBadSession = new JMAPClient(createMockTransport({ getResponse: badSession }), {
                hostname: "api.example.com",
            });

            await clientWithBadSession.connect();
            expect(() => clientWithBadSession.getEventSourceUrl(["Email"], "no", 0)).toThrow(
                "Missing eventSourceUrl in session",
            );
        });

        it("should append parameters as query string when placeholders are omitted from template URL", async () => {
            // Create a session with a fixed event source URL without {types} placeholder
            const fixedUrlSession = {
                ...eventSourceTestSession,
                eventSourceUrl: "https://api.example.com/jmap/event/",
            };

            const fixedUrlClient = new JMAPClient(createMockTransport({ getResponse: fixedUrlSession }), {
                hostname: "api.example.com",
            });

            await fixedUrlClient.connect();
            const url = fixedUrlClient.getEventSourceUrl(["Email", "CalendarEvent"], "no", 0);

            // Should append types as a query parameter
            expect(url.toString()).toBe(
                "https://api.example.com/jmap/event/?types=Email%2CCalendarEvent&closeafter=no&ping=0",
            );
        });

        it("should handle form-style query expansion in templates", async () => {
            // Create a session with a form-style query expansion template
            const queryStyleSession = {
                ...eventSourceTestSession,
                eventSourceUrl: "https://api.example.com/jmap/event/{?types,closeafter,ping}",
            };

            const queryStyleClient = new JMAPClient(createMockTransport({ getResponse: queryStyleSession }), {
                hostname: "api.example.com",
            });

            await queryStyleClient.connect();
            const url = queryStyleClient.getEventSourceUrl(["Email"], "state", 120);

            // Should correctly expand the query parameters
            expect(url.toString()).toBe("https://api.example.com/jmap/event/?types=Email&closeafter=state&ping=120");
        });

        it("should handle all parameters correctly", async () => {
            await client.connect();
            const url = client.getEventSourceUrl(["Email", "CalendarEvent"], "no", 60);
            expect(url.toString()).toBe(
                "https://api.example.com/jmap/event/Email%2CCalendarEvent?closeafter=no&ping=60",
            );
        });

        it("should add all required parameters as query parameters", async () => {
            // Create a session with a URL without any placeholders
            const plainUrlSession = {
                ...eventSourceTestSession,
                eventSourceUrl: "https://api.example.com/jmap/event",
            };

            const plainUrlClient = new JMAPClient(createMockTransport({ getResponse: plainUrlSession }), {
                hostname: "api.example.com",
            });

            await plainUrlClient.connect();
            const url = plainUrlClient.getEventSourceUrl(["Email"], "no", 0);

            // All parameters should be added as query params
            expect(url.toString()).toBe("https://api.example.com/jmap/event?types=Email&closeafter=no&ping=0");
        });

        it("should handle different closeafter values correctly", async () => {
            await client.connect();

            // With "no" closeafter value
            let url = client.getEventSourceUrl(["Email"], "no", 0);
            expect(url.toString()).toBe("https://api.example.com/jmap/event/Email?closeafter=no&ping=0");

            // With "state" closeafter value
            url = client.getEventSourceUrl(["*"], "state", 0);
            expect(url.toString()).toBe("https://api.example.com/jmap/event/%2A?closeafter=state&ping=0");

            // With different ping values
            url = client.getEventSourceUrl(["Email"], "no", 300);
            expect(url.toString()).toBe("https://api.example.com/jmap/event/Email?closeafter=no&ping=300");
        });

        it("should include parameters with defined values", async () => {
            await client.connect();

            const url = client.getEventSourceUrl(["Email"], "state", 0);
            expect(url.toString()).toBe("https://api.example.com/jmap/event/Email?closeafter=state&ping=0");
            expect(url.searchParams.has("closeafter")).toBe(true);
            expect(url.searchParams.has("ping")).toBe(true);
        });

        it("should handle all parameters with specific values", async () => {
            await client.connect();

            // Test with zero ping value
            const url = client.getEventSourceUrl("*", "no", 0);
            expect(url.toString()).toBe("https://api.example.com/jmap/event/%2A?closeafter=no&ping=0");
        });
    });
});
