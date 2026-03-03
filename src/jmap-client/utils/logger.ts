import type { Logger, LoggerMethod } from "../types.js";

/**
 * Create a safe logger that wraps an external logger implementation.
 * All logger methods are wrapped in try/catch to prevent errors in the logger from affecting the application.
 */
export function createLogger(getCurrentLogger: () => Logger | undefined): Logger {
    const log =
        (method: keyof Logger): LoggerMethod =>
        (message, ...optionalParameters) => {
            try {
                getCurrentLogger()?.[method](message, ...(optionalParameters as unknown[]));
            } catch {
                // Ignore any errors from the external logger
            }
        };
    return {
        log: log("log"),
        info: log("info"),
        warn: log("warn"),
        error: log("error"),
        debug: log("debug"),
    };
}
