import { describe, expect, it } from "vitest";
import mockSession from "../mock-session.json" with { type: "json" };
import { createMockLogger } from "../test-utils.js";
import { JMAPSessionSchema } from "../types.js";
import { parseAndValidateJMAPSession } from "./validate-session.js";

const validSession = JMAPSessionSchema.parse(mockSession);

describe("parseAndValidateJMAPSession", () => {
    it("returns a validated session for valid input (not frozen)", () => {
        const logger = createMockLogger();
        const result = parseAndValidateJMAPSession(validSession, logger);
        expect(result).toEqual(validSession);
        expect(Object.isFrozen(result)).toBe(false);
        expect(logger.error).not.toHaveBeenCalled();
    });

    it("throws and logs for invalid input", () => {
        const logger = createMockLogger();
        const invalid = { ...validSession, username: 123 };
        expect(() => parseAndValidateJMAPSession(invalid, logger)).toThrowError("Invalid JMAP session response");
        expect(logger.error).toHaveBeenCalledWith(
            "Invalid JMAP session response",
            expect.objectContaining({ error: expect.any(Object) }),
        );
    });

    it("throws with cause set to the ZodError", () => {
        const logger = createMockLogger();
        const invalid = { ...validSession, username: 123 };
        try {
            parseAndValidateJMAPSession(invalid, logger);
        } catch (e) {
            /* istanbul ignore else */
            if (e instanceof Error) {
                expect(e).toBeInstanceOf(Error);
                expect(e).toHaveProperty("cause");
                expect((e.cause as Error).name).toBe("ZodError");
            } else {
                throw new Error("Expected an Error with a cause");
            }
        }
    });
});
