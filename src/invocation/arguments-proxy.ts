import type { Invocation } from "./invocation.js";
import type { BaseInvocationArgs } from "./types.js";

/**
 * Creates a Proxy over an {@link Invocation} that behaves like a plain object.
 *
 * The returned Proxy supports property access, `in`, `Object.keys()`, spread,
 * and `JSON.stringify()`. If the host implements `setArgument` and `deleteArgument`,
 * property assignment and deletion delegate to those methods (preserving any
 * validation they perform). Otherwise, those operations throw a TypeError.
 *
 * @param host The backing Invocation to proxy
 * @returns A Proxy that presents the host's arguments as an object
 */
export function createArgumentsProxy<TArgs extends BaseInvocationArgs>(host: Invocation<TArgs>): TArgs {
    type ArgumentKey = keyof TArgs & string;
    return new Proxy<Invocation<TArgs>>(host, {
        get: (target, prop: ArgumentKey) => target.getArgument(prop),
        has: (target, prop: ArgumentKey) => target.hasArgument(prop),
        ownKeys: (target) => target.argumentKeys(),
        getOwnPropertyDescriptor: (target, prop: ArgumentKey) => {
            if (target.hasArgument(prop)) {
                return {
                    configurable: true,
                    enumerable: true,
                    writable: typeof target.setArgument === "function",
                    value: target.getArgument(prop),
                };
            }
            return undefined;
        },
        set(target, prop: ArgumentKey, value: Parameters<Invocation<TArgs>["setArgument"]>[1]) {
            target.setArgument(prop, value);
            return true;
        },
        deleteProperty(target, prop: ArgumentKey) {
            return target.deleteArgument(prop);
        },
    }) as unknown as TArgs;
}
