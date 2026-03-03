import { vi } from "vitest";
import { JMAPClient } from "./jmap-client.js";
import { createMockTransport } from "./test-utils.js";

// Mock the RequestBuilder import
vi.mock("../request-builder/request-builder.js", () => ({
    RequestBuilder: vi.fn(),
}));

const { RequestBuilder } = await import("../request-builder/request-builder.js");
const MockRequestBuilder = RequestBuilder as unknown as ReturnType<typeof vi.fn>;

describe("JMAPClient createRequestBuilder", () => {
    const clientContextMatcher = expect.objectContaining({
        logger: expect.objectContaining({
            info: expect.any(Function),
            error: expect.any(Function),
            debug: expect.any(Function),
            warn: expect.any(Function),
            log: expect.any(Function),
        }),
        emitter: expect.any(Function),
    });

    beforeEach(() => {
        MockRequestBuilder.mockClear();
    });

    it("should create a new RequestBuilder instance", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api.example.com" });

        const builder = client.createRequestBuilder();

        expect(MockRequestBuilder).toHaveBeenCalledTimes(1);
        expect(MockRequestBuilder).toHaveBeenCalledWith(client, clientContextMatcher);
        expect(builder).toBeDefined();
    });

    it("should create multiple independent RequestBuilder instances", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api.example.com" });

        const builder1 = client.createRequestBuilder();
        const builder2 = client.createRequestBuilder();

        expect(MockRequestBuilder).toHaveBeenCalledTimes(2);
        expect(MockRequestBuilder).toHaveBeenNthCalledWith(1, client, clientContextMatcher);
        expect(MockRequestBuilder).toHaveBeenNthCalledWith(2, client, clientContextMatcher);
        expect(builder1).not.toBe(builder2);
    });

    it("should work when client is not yet connected", () => {
        const transport = createMockTransport();
        const client = new JMAPClient(transport, { hostname: "api.example.com" });

        const builder = client.createRequestBuilder();

        expect(MockRequestBuilder).toHaveBeenCalledWith(client, clientContextMatcher);
        expect(client.serverCapabilities).toBeNull();
        expect(client.accounts).toBeNull();
        expect(builder).toBeDefined();
    });
});
