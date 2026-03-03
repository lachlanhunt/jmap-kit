import type { Logger, LoggerMethod } from "../../src/jmap-client/types.js";

export type LogLevel = "debug" | "info" | "log" | "warn" | "error" | "silent";

const levelOrder: Record<Exclude<LogLevel, "silent">, number> = {
    debug: 10,
    log: 20,
    info: 30,
    warn: 40,
    error: 50,
};

const colors = {
    reset: "\u001b[0m",
    gray: "\u001b[90m",
    blue: "\u001b[34m",
    green: "\u001b[32m",
    yellow: "\u001b[33m",
    red: "\u001b[31m",
};

const levelStyles: Record<Exclude<LogLevel, "silent">, { label: string; color: string }> = {
    debug: { label: "DEBUG", color: colors.gray },
    log: { label: "LOG", color: colors.blue },
    info: { label: "INFO", color: colors.green },
    warn: { label: "WARN", color: colors.yellow },
    error: { label: "ERROR", color: colors.red },
};

const fallbackConsole: Record<Exclude<LogLevel, "silent">, LoggerMethod> = {
    debug: console.debug.bind(console),
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};

function shouldLog(current: LogLevel, level: Exclude<LogLevel, "silent">): boolean {
    if (current === "silent") return false;
    return levelOrder[level] >= levelOrder[current];
}

function formatPrefix(level: Exclude<LogLevel, "silent">): string {
    const style = levelStyles[level];
    return `${style.color}${style.label}${colors.reset}`;
}

export function createExampleLogger(level: LogLevel = "info"): Logger {
    const make = (lvl: Exclude<LogLevel, "silent">): LoggerMethod => {
        return (message: string, ...optionalParams: unknown[]) => {
            if (!shouldLog(level, lvl)) return;
            fallbackConsole[lvl](`${formatPrefix(lvl)} ${message}`, ...optionalParams);
        };
    };

    return {
        debug: make("debug"),
        log: make("log"),
        info: make("info"),
        warn: make("warn"),
        error: make("error"),
    };
}
