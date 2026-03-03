/**
 * A function that handles processing a response invocation.
 */
// The use of `any` here is intentional and justified: this library guarantees at runtime
// that the correct invocation type will be passed to the correct handler, but TypeScript
// cannot express this dynamic contract at compile time. Using `any` allows consumers to
// write strongly-typed handlers without unnecessary type assertions or boilerplate.
//
// However, consumers are responsible for ensuring that the handlers are correctly typed
// and that they handle the invocations as expected.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HandlerFn = (invocation: any) => void | Promise<void>;

/**
 * A mapping of invocation IDs (symbols), method names (e.g., "Mailbox/get"), data types (e.g. "Mailbox"),
 * or the special property `error` to handler functions.
 */
export type InvocationHandlerMap = Record<string | symbol, HandlerFn> & { error?: HandlerFn };
