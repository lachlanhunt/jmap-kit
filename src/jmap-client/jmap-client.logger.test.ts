import { JMAPClient } from "./jmap-client.js";
import mockSession from "./mock-session.json" with { type: "json" };
import { createMockLogger, createMockTransport } from "./test-utils.js";

describe("JMAPClient logger", () => {
    it("should set a custom logger and allow chaining", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const logger = createMockLogger();

        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        const result = client.withLogger(logger);
        expect(result).toBe(client);

        await client.connect();
        expect(logger.info).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalled();
    });

    it("should invoke methods on the custom logger when connecting", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const logger = createMockLogger();

        const client = new JMAPClient(transport, { hostname: "api.example.com", logger });
        await client.connect();

        expect(logger.info).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalled();
    });

    it("should override the logger from the constructor with a new logger via withLogger", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const logger1 = createMockLogger();
        const logger2 = createMockLogger();

        const client = new JMAPClient(transport, { hostname: "api.example.com", logger: logger1 });

        // Reset the call counts after construction since the constructor legitimately uses logger1
        logger1.debug.mockClear();
        logger1.info.mockClear();

        client.withLogger(logger2);
        await client.connect();

        // Only logger2 should be called for operations after withLogger
        expect(logger2.info).toHaveBeenCalled();
        expect(logger2.debug).toHaveBeenCalled();
        expect(logger1.info).not.toHaveBeenCalled();
        expect(logger1.debug).not.toHaveBeenCalled();
    });

    it("should swallow errors thrown by logger methods and not propagate", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const errorLogger = {
            info: vi.fn(() => {
                throw new Error("Logger error");
            }),
            debug: vi.fn(() => {
                throw new Error("Logger error");
            }),
            warn: vi.fn(() => {
                throw new Error("Logger error");
            }),
            error: vi.fn(() => {
                throw new Error("Logger error");
            }),
            log: vi.fn(() => {
                throw new Error("Logger error");
            }),
        };
        const client = new JMAPClient(transport, { hostname: "api.example.com" });
        client.withLogger(errorLogger);
        // Should not throw even though logger throws
        await expect(client.connect()).resolves.not.toThrow();
    });

    it("should allow swapping loggers multiple times and only use the latest", async () => {
        const transport = createMockTransport({ getResponse: mockSession });
        const logger1 = createMockLogger();
        const logger2 = createMockLogger();
        const logger3 = createMockLogger();
        const client = new JMAPClient(transport, { hostname: "api.example.com", logger: logger1 });

        // Reset the call counts after construction since the constructor legitimately uses logger1
        logger1.debug.mockClear();
        logger1.info.mockClear();

        client.withLogger(logger2);
        client.withLogger(logger3);
        await client.connect();
        expect(logger3.info).toHaveBeenCalled();
        expect(logger3.debug).toHaveBeenCalled();
        expect(logger2.info).not.toHaveBeenCalled();
        expect(logger2.debug).not.toHaveBeenCalled();
        expect(logger1.info).not.toHaveBeenCalled();
        expect(logger1.debug).not.toHaveBeenCalled();
    });
});
