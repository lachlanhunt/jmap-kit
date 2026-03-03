import { ErrorInvocation } from "./error-invocation.js";
import { ResultReference } from "./result-reference.js";
import { isErrorInvocation, isJMAPResponseInvocationErrorArgs, isResultReference } from "./utils.js";

describe("isResultReference", () => {
    it("returns true for a ResultReference instance", () => {
        const ref = new ResultReference(Symbol(), "example", "path");
        expect(isResultReference(ref)).toBe(true);
    });

    it("returns false for plain objects", () => {
        expect(isResultReference({ id: "id_1", path: "foo" })).toBe(false);
    });

    it("returns false for null", () => {
        expect(isResultReference(null)).toBe(false);
    });

    it("returns false for primitives", () => {
        expect(isResultReference("string")).toBe(false);
        expect(isResultReference(123)).toBe(false);
        expect(isResultReference(false)).toBe(false);
    });
});

describe("isErrorInvocation", () => {
    it("returns true for an ErrorInvocation instance", () => {
        const err = new ErrorInvocation({ type: "serverFail", description: "fail" }, Symbol("err"));
        expect(isErrorInvocation(err)).toBe(true);
    });

    it("returns false for non-ErrorInvocation objects", () => {
        expect(isErrorInvocation({ type: "serverFail" })).toBe(false);
        expect(isErrorInvocation(null)).toBe(false);
        expect(isErrorInvocation("error" as unknown)).toBe(false);
    });
});

describe("isJMAPResponseInvocationErrorArgs", () => {
    it("returns true for a valid error args object", () => {
        expect(isJMAPResponseInvocationErrorArgs({ type: "invalidArguments" })).toBe(true);
        expect(isJMAPResponseInvocationErrorArgs({ type: "customType", foo: 1 })).toBe(true);
    });

    it("returns false for missing type property", () => {
        expect(isJMAPResponseInvocationErrorArgs({})).toBe(false);
        expect(isJMAPResponseInvocationErrorArgs({ foo: 1 })).toBe(false);
    });

    it("returns false for non-string type property", () => {
        expect(isJMAPResponseInvocationErrorArgs({ type: 123 })).toBe(false);
        expect(isJMAPResponseInvocationErrorArgs({ type: null })).toBe(false);
    });

    it("returns false for non-objects", () => {
        expect(isJMAPResponseInvocationErrorArgs(null)).toBe(false);
        expect(isJMAPResponseInvocationErrorArgs("error")).toBe(false);
        expect(isJMAPResponseInvocationErrorArgs(42)).toBe(false);
    });
});
