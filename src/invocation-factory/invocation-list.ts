import type { ErrorInvocation } from "../invocation/error-invocation.js";
import type { Invocation } from "../invocation/invocation.js";
import type { BaseInvocationArgs } from "../invocation/types.js";
import { isErrorInvocation } from "../invocation/utils.js";
import type { ClientContext, Logger } from "../jmap-client/types.js";
import type { HandlerFn, InvocationHandlerMap } from "./types.js";

export class InvocationList<T extends BaseInvocationArgs> implements Iterable<Invocation<T> | ErrorInvocation> {
    readonly #invocations: (Invocation<T> | ErrorInvocation)[];
    readonly #logger: Logger;

    /**
     * @param invocations The list of invocations (or errors) to manage.
     * @param logger Optional logger instance for logging within the invocation list.
     */
    constructor(invocations: (Invocation<T> | ErrorInvocation)[], { logger }: ClientContext) {
        this.#invocations = invocations;
        this.#logger = logger;
    }

    /**
     * @returns An iterator over the invocations and errors in the list.
     */
    [Symbol.iterator]() {
        return this.#invocations[Symbol.iterator]();
    }

    /**
     * Get the number of invocations and errors in the list.
     */
    get size() {
        return this.#invocations.length;
    }

    /**
     * Log debug information about handler dispatch.
     * @param invocation The invocation being dispatched
     * @param handlerType The type of handler being used
     */
    #logDispatch(invocation: Invocation<T>, handlerType: "id" | "name" | "dataType" | "default"): void {
        const messages = {
            id: `Dispatching invocation for ${invocation.name} to handler by ID`,
            name: `Dispatching invocation for ${invocation.name} to handler: ${invocation.name}`,
            dataType: `Dispatching invocation for ${invocation.name} to handler: ${invocation.dataType}`,
            default: `Dispatching invocation for ${invocation.name} to default handler`,
        };
        this.#logger.debug(messages[handlerType]);
    }

    /**
     * Dispatch each invocation or error in the list to the appropriate handler function.
     *
     * @param handlers An object mapping method IDs (symbols), method names (e.g., "Mailbox/get"),
     *        data types (e.g. "Mailbox"), or the special property `error` to handler functions.
     *        - Each handler receives the invocation of the appropriate type.
     *        - The `error` property, if present, will be called for error invocations.
     * @param defaultHandler Optional handler for invocations with no registered handler.
     * @returns A promise that resolves when all handlers have been called.
     */
    async dispatch(handlers: InvocationHandlerMap, defaultHandler?: HandlerFn): Promise<void> {
        for (const invocation of this) {
            if (isErrorInvocation(invocation)) {
                this.#logger.warn(`Dispatching error invocation: ${invocation.type}`);
                await handlers.error?.(invocation);

                continue;
            }

            let handler = handlers[invocation.id];
            if (handler !== undefined) {
                this.#logDispatch(invocation, "id");
            } else if ((handler = handlers[invocation.name]) !== undefined) {
                this.#logDispatch(invocation, "name");
            } else if ((handler = handlers[invocation.dataType]) !== undefined) {
                this.#logDispatch(invocation, "dataType");
            } else if ((handler = defaultHandler) !== undefined) /* NOSONAR */ {
                this.#logDispatch(invocation, "default");
            } else {
                this.#logger.info(`No handler found for invocation: ${invocation.name}`);
                continue;
            }
            await handler(invocation);
        }
    }
}
