import type {
    BaseFilterCondition,
    BaseGetRequestInvocationArgs,
    BaseGetResponseInvocationArgs,
    BaseInvocationArgs,
    BaseQueryRequestInvocationArgs,
    BaseQueryResponseInvocationArgs,
    BaseSetRequestInvocationArgs,
    BaseSetResponseInvocationArgs,
} from "../../invocation/types.js";

/**
 * The arguments for an Example/echo request invocation (illustrative example)
 */
export type ExampleEchoRequestInvocationArgs = BaseInvocationArgs;

/**
 * The arguments for an Example/get request invocation (illustrative example)
 */
export type ExampleGetRequestInvocationArgs = BaseGetRequestInvocationArgs<BaseInvocationArgs>;

/**
 * The arguments for an Example/set request invocation (illustrative example)
 */
export type ExampleSetRequestInvocationArgs = BaseSetRequestInvocationArgs<BaseInvocationArgs>;

/**
 * The arguments for an Example/query request invocation (illustrative example)
 */
export type ExampleQueryRequestInvocationArgs = BaseQueryRequestInvocationArgs<BaseInvocationArgs, BaseFilterCondition>;

/**
 * The response arguments for an Example/get response invocation (illustrative example)
 */
export type ExampleGetResponseInvocationArgs = BaseGetResponseInvocationArgs<BaseInvocationArgs>;

/**
 * The response arguments for an Example/set response invocation (illustrative example)
 */
export type ExampleSetResponseInvocationArgs = BaseSetResponseInvocationArgs<BaseInvocationArgs>;

/**
 * The response arguments for an Example/query response invocation (illustrative example)
 */
export type ExampleQueryResponseInvocationArgs = BaseQueryResponseInvocationArgs;

/**
 * Union type of all Example capability invocation arguments (request and response, illustrative example)
 */
export type ExampleInvocationArgs =
    | ExampleEchoRequestInvocationArgs
    | ExampleGetRequestInvocationArgs
    | ExampleSetRequestInvocationArgs
    | ExampleQueryRequestInvocationArgs
    | ExampleGetResponseInvocationArgs
    | ExampleSetResponseInvocationArgs
    | ExampleQueryResponseInvocationArgs;
