import type { JMAPResponseInvocationErrorArgs } from "../common/types.js";
import { ErrorInvocation } from "./error-invocation.js";
import { ResultReference } from "./result-reference.js";

/**
 * Type guard to check if a value is an instance of ResultReference.
 * @param value The value to check.
 * @returns True if the value is a ResultReference, false otherwise.
 */
export function isResultReference(value: unknown): value is ResultReference {
    return value instanceof ResultReference;
}

/**
 * Type guard to check if an object is an ErrorInvocation instance.
 * @param obj The object to check.
 * @returns True if the object is an ErrorInvocation, false otherwise.
 */
export function isErrorInvocation(obj: unknown): obj is ErrorInvocation {
    return obj instanceof ErrorInvocation;
}

/**
 * Type guard to check if an object is a valid JMAPResponseInvocationErrorArgs.
 * @param args The object to check.
 * @returns True if the object has a string `type` property, false otherwise.
 */
export function isJMAPResponseInvocationErrorArgs(args: unknown): args is JMAPResponseInvocationErrorArgs {
    return (
        typeof args === "object" &&
        args !== null &&
        "type" in args &&
        typeof (args as { type: unknown }).type === "string"
    );
}
