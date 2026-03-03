import { describe, expect, it } from "vitest";
import "./to-have-headers.js";

describe("toHaveHeaders matcher", () => {
    describe("positive assertions", () => {
        it("should pass when Headers object contains all expected headers", () => {
            const headers = new Headers({
                "Content-Type": "application/json",
                Authorization: "Bearer token123",
                "X-Custom-Header": "custom-value",
            });

            expect(headers).toHaveHeaders({
                "Content-Type": "application/json",
                Authorization: "Bearer token123",
            });
        });

        it("should pass when checking a single header", () => {
            const headers = new Headers({
                "Content-Type": "application/json",
            });

            expect(headers).toHaveHeaders({
                "Content-Type": "application/json",
            });
        });

        it("should pass when Headers object contains more headers than expected", () => {
            const headers = new Headers({
                "Content-Type": "application/json",
                Authorization: "Bearer token123",
                "X-Extra-Header": "extra-value",
            });

            expect(headers).toHaveHeaders({
                "Content-Type": "application/json",
            });
        });

        it("should pass with case-insensitive header names", () => {
            const headers = new Headers({
                "content-type": "application/json",
            });

            expect(headers).toHaveHeaders({
                "Content-Type": "application/json",
            });
        });

        it("should pass when expected headers object is empty", () => {
            const headers = new Headers({
                "Content-Type": "application/json",
            });

            expect(headers).toHaveHeaders({});
        });
    });

    describe("negative assertions", () => {
        it("should fail when Headers object is missing expected header", () => {
            const headers = new Headers({
                "Content-Type": "application/json",
            });

            expect(() => {
                expect(headers).toHaveHeaders({
                    Authorization: "Bearer token123",
                });
            }).toThrow();
        });

        it("should fail when header value doesn't match", () => {
            const headers = new Headers({
                "Content-Type": "application/xml",
            });

            expect(() => {
                expect(headers).toHaveHeaders({
                    "Content-Type": "application/json",
                });
            }).toThrow();
        });

        it("should fail when some headers match but others don't", () => {
            const headers = new Headers({
                "Content-Type": "application/json",
                Authorization: "Bearer wrong-token",
            });

            expect(() => {
                expect(headers).toHaveHeaders({
                    "Content-Type": "application/json",
                    Authorization: "Bearer correct-token",
                });
            }).toThrow();
        });
    });

    describe("not assertions", () => {
        it("should pass when Headers object does not contain expected header", () => {
            const headers = new Headers({
                "Content-Type": "application/json",
            });

            expect(headers).not.toHaveHeaders({
                Authorization: "Bearer token123",
            });
        });

        it("should pass when header value doesn't match", () => {
            const headers = new Headers({
                "Content-Type": "application/xml",
            });

            expect(headers).not.toHaveHeaders({
                "Content-Type": "application/json",
            });
        });

        it("should fail when Headers object contains any of the expected headers", () => {
            const headers = new Headers({
                "Content-Type": "application/json",
                Authorization: "Bearer token123",
            });

            expect(() => {
                expect(headers).not.toHaveHeaders({
                    "Content-Type": "application/json",
                    "X-Missing": "missing-value",
                });
            }).toThrow();

            expect(() => {
                expect(headers).not.toHaveHeaders({
                    Authorization: "Bearer token123",
                    "X-Missing": "missing-value",
                });
            }).toThrow();
        });
    });

    describe("error handling", () => {
        it("should fail with descriptive message when received is null", () => {
            expect(() => {
                expect(null).toHaveHeaders({
                    "Content-Type": "application/json",
                });
            }).toThrow("Expected Headers, but received object");
        });

        it("should fail with descriptive message when received is undefined", () => {
            expect(() => {
                expect(undefined).toHaveHeaders({
                    "Content-Type": "application/json",
                });
            }).toThrow("Expected Headers, but received undefined");
        });

        it("should fail with descriptive message when received is a string", () => {
            expect(() => {
                expect("not-headers").toHaveHeaders({
                    "Content-Type": "application/json",
                });
            }).toThrow("Expected Headers, but received string");
        });

        it("should fail with descriptive message when received is a number", () => {
            expect(() => {
                expect(123).toHaveHeaders({
                    "Content-Type": "application/json",
                });
            }).toThrow("Expected Headers, but received number");
        });

        it("should fail with descriptive message when received is a plain object", () => {
            expect(() => {
                expect({ "Content-Type": "application/json" }).toHaveHeaders({
                    "Content-Type": "application/json",
                });
            }).toThrow("Expected Headers, but received Object");
        });

        it("should fail with descriptive message when received is an array", () => {
            expect(() => {
                expect([]).toHaveHeaders({
                    "Content-Type": "application/json",
                });
            }).toThrow("Expected Headers, but received Array");
        });
    });

    describe("message formatting", () => {
        it("should provide helpful error message on failure", () => {
            const headers = new Headers({
                "Content-Type": "application/xml",
                Authorization: "Bearer token123",
            });

            try {
                expect(headers).toHaveHeaders({
                    "Content-Type": "application/json",
                    "X-Missing": "missing-value",
                });
            } catch (error) {
                const message = (error as Error).message;
                expect(message).toContain("Expected Headers to have headers:");
                expect(message).toContain('"Content-Type": "application/json"');
                expect(message).toContain('"X-Missing": "missing-value"');
            }
        });

        it("should provide helpful error message for not assertion failure", () => {
            const headers = new Headers({
                "Content-Type": "application/json",
            });

            try {
                expect(headers).not.toHaveHeaders({
                    "Content-Type": "application/json",
                });
            } catch (error) {
                const message = (error as Error).message;
                expect(message).toContain("Expected Headers to not have headers:");
                expect(message).toContain('"Content-Type": "application/json"');
            }
        });
    });

    describe("edge cases", () => {
        it("should handle empty Headers object", () => {
            const headers = new Headers();

            expect(headers).toHaveHeaders({});

            expect(() => {
                expect(headers).toHaveHeaders({
                    "Content-Type": "application/json",
                });
            }).toThrow();
        });

        it("should handle headers with empty string values", () => {
            const headers = new Headers({
                "X-Empty": "",
            });

            expect(headers).toHaveHeaders({
                "X-Empty": "",
            });

            expect(() => {
                expect(headers).toHaveHeaders({
                    "X-Empty": "not-empty",
                });
            }).toThrow();
        });

        it("should handle headers with special characters", () => {
            const headers = new Headers({
                "X-Special": "value with spaces and symbols!@#$%",
            });

            expect(headers).toHaveHeaders({
                "X-Special": "value with spaces and symbols!@#$%",
            });
        });

        it("should handle multiple headers with same name (though not recommended)", () => {
            // Headers constructor automatically combines values with comma
            const headers = new Headers();
            headers.append("Accept", "application/json");
            headers.append("Accept", "text/plain");

            expect(headers).toHaveHeaders({
                Accept: "application/json, text/plain",
            });
        });
    });
});
