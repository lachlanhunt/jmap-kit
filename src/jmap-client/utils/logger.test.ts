import { createMockLogger } from "../test-utils.js";
import { createLogger } from "./logger.js";

describe("createLogger", () => {
    it("should call the correct logger methods and not throw if logger is missing", () => {
        const safeLogger = createLogger(() => undefined);
        expect(() => safeLogger.info("test")).not.toThrow();
        expect(() => safeLogger.error("test")).not.toThrow();
        expect(() => safeLogger.warn("test")).not.toThrow();
        expect(() => safeLogger.debug("test")).not.toThrow();
        expect(() => safeLogger.log("test")).not.toThrow();
    });

    it("should swallow errors thrown by the provided logger", () => {
        const errorLogger = {
            info: () => {
                throw new Error("fail");
            },
            error: () => {
                throw new Error("fail");
            },
            warn: () => {
                throw new Error("fail");
            },
            debug: () => {
                throw new Error("fail");
            },
            log: () => {
                throw new Error("fail");
            },
        };
        const safeLogger = createLogger(() => errorLogger);
        expect(() => safeLogger.info("test")).not.toThrow();
        expect(() => safeLogger.error("test")).not.toThrow();
        expect(() => safeLogger.warn("test")).not.toThrow();
        expect(() => safeLogger.debug("test")).not.toThrow();
        expect(() => safeLogger.log("test")).not.toThrow();
    });

    it("should pass all logger methods through to the wrapped logger", () => {
        const wrappedLogger = createMockLogger();
        const safeLogger = createLogger(() => wrappedLogger);
        safeLogger.info("info message", 1, 2);
        safeLogger.error("error message", 3, 4);
        safeLogger.warn("warn message", 5, 6);
        safeLogger.debug("debug message", 7, 8);
        safeLogger.log("log message", 9, 10);
        expect(wrappedLogger.info).toHaveBeenCalledWith("info message", 1, 2);
        expect(wrappedLogger.error).toHaveBeenCalledWith("error message", 3, 4);
        expect(wrappedLogger.warn).toHaveBeenCalledWith("warn message", 5, 6);
        expect(wrappedLogger.debug).toHaveBeenCalledWith("debug message", 7, 8);
        expect(wrappedLogger.log).toHaveBeenCalledWith("log message", 9, 10);
    });
});
