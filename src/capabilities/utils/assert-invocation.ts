import type { JMAPDataType, JMAPMethodName } from "../../common/types.js";
import type { Invocation } from "../../invocation/invocation.js";
import type { BaseInvocationArgs } from "../../invocation/types.js";
import { assertInvocationDataType } from "./assert-invocation-datatype.js";
import { assertInvocationMethod } from "./assert-invocation-method.js";

/**
 * Type assertion function to ensure an invocation has the specified method
 */
export function assertInvocation<T extends BaseInvocationArgs>(
    invocation: Invocation<T>,
    dataType: JMAPDataType,
    method: JMAPMethodName,
): asserts invocation is Invocation<T> {
    try {
        assertInvocationDataType(invocation, dataType);
        assertInvocationMethod(invocation, method);
    } catch (err) {
        if (err instanceof TypeError) {
            throw err;
        } else {
            throw new Error(`Expected invocation to be "${dataType}/${method}", but got "${invocation.name}"`, {
                cause: err as Error,
            });
        }
    }
}
