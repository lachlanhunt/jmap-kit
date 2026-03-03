import type { JMAPMethodName } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { BaseInvocationArgs } from "../../invocation/types.js";

/**
 * Type assertion function to ensure an invocation has the specified method
 */
export function assertInvocationMethod<T extends BaseInvocationArgs>(
    invocation: Invocation<T>,
    method: JMAPMethodName,
): asserts invocation is Invocation<T> {
    if (!(invocation instanceof Invocation)) {
        throw new TypeError(`Invocation is required for ${method} requests`);
    }

    if (invocation.method !== method) {
        throw new Error(`Expected invocation method to be '${method}', but got '${invocation.method}'`);
    }
}
