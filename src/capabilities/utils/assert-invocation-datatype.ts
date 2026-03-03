import type { JMAPDataType } from "../../common/types.js";
import { Invocation } from "../../invocation/invocation.js";
import type { BaseInvocationArgs } from "../../invocation/types.js";

/**
 * Type assertion function to ensure an invocation has the specified method
 */
export function assertInvocationDataType<T extends BaseInvocationArgs>(
    invocation: Invocation<T>,
    dataType: JMAPDataType,
): asserts invocation is Invocation<T> {
    if (!(invocation instanceof Invocation)) {
        throw new TypeError(`Invocation is required for ${dataType} requests`);
    }

    if (invocation.dataType !== dataType) {
        throw new Error(`Expected invocation dataType to be '${dataType}', but got '${invocation.dataType}'`);
    }
}
