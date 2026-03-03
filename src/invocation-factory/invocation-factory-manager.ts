import type { Id, JMAPDataType, JMAPMethodName, JMAPResponseInvocation } from "../common/types.js";
import { ErrorInvocation } from "../invocation/error-invocation.js";
import { isJMAPResponseInvocationErrorArgs } from "../invocation/utils.js";
import type { ClientContext, EventEmitterFn, JMAPClientInterface, Logger } from "../jmap-client/types.js";
import { InvocationList } from "./invocation-list.js";

/**
 * Manages construction of invocations from JMAP method responses using the capability registry.
 */
export class InvocationFactoryManager {
    readonly #logger: Logger;
    readonly #emitter: EventEmitterFn;
    readonly #client: JMAPClientInterface<unknown>;

    constructor(client: JMAPClientInterface<unknown>, { logger, emitter }: ClientContext) {
        this.#logger = logger;
        this.#emitter = emitter;
        this.#client = client;
    }

    /**
     * Construct invocation objects from JMAP method responses.
     *
     * @param methodResponses The array of JMAP method responses.
     * @param reverseIdMap Map from method call IDs to internal symbols.
     * @returns An InvocationList containing the constructed invocation objects.
     * @throws If no factory is registered for a data type, or there's no factory
     *         function for the particular method.
     */
    createInvocations(methodResponses: JMAPResponseInvocation[], reverseIdMap: Map<Id, symbol>) {
        const responses = methodResponses.map(([name, args, methodCallId]) => {
            const id = reverseIdMap.get(methodCallId);
            if (!id) this.#logger.warn(`No corresponding ID found for ${methodCallId} in the Request Builder`);

            if (name === "error") {
                this.#logger.warn(`Received error response for invocation with ID: ${methodCallId}`);

                if (!isJMAPResponseInvocationErrorArgs(args)) {
                    this.#logger.warn(
                        `Error response missing "type" property for invocation with ID: ${methodCallId}, defaulting to "serverFail"`,
                    );
                    return new ErrorInvocation({ ...args, type: "serverFail" }, id);
                }

                return new ErrorInvocation(args, id);
            }

            this.#logger.info(`Constructing ${name} invocation with ID: ${methodCallId}`);
            const [dataType, methodName] = name.split("/") as [JMAPDataType, JMAPMethodName];

            const factoryFn = this.#client.capabilityRegistry.getInvocationResponseFactory(dataType, methodName);
            if (!factoryFn) {
                this.#logger.error(`No response factory function available for ${name}`);
                throw new Error(`No response factory function available for ${name}`);
            }

            return factoryFn(args, id);
        });

        return new InvocationList(responses, { logger: this.#logger, emitter: this.#emitter });
    }
}
