import type { BaseInvocationArgs } from "../../invocation/types.js";

/**
 * The arguments for a Core/echo request invocation
 */
export type CoreEchoRequestInvocationArgs = BaseInvocationArgs;

/**
 * The response arguments for a Core/echo response invocation
 */
export type CoreEchoResponseInvocationArgs = BaseInvocationArgs;

/**
 * Union type of all Core capability invocation arguments (request and response)
 */
export type CoreInvocationArgs = BaseInvocationArgs;
