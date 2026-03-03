import type { Id } from "../../common/types.js";
import type {
    BaseChangesRequestInvocationArgs,
    BaseChangesResponseInvocationArgs,
    BaseGetRequestInvocationArgs,
    BaseGetResponseInvocationArgs,
} from "../../invocation/types.js";

/**
 * ThreadObject properties set by the server.
 */
export type ThreadObjectServerSet = Readonly<{
    /**
     * (immutable) The id of the Thread.
     */
    id: Id;

    /**
     * The ids of the Emails in the Thread, sorted by the receivedAt date of the Email, oldest first.
     */
    emailIds: Id[];
}>;

/**
 * Properties of the Thread object.
 */
export type ThreadObject = ThreadObjectServerSet;

/**
 * The arguments for fetching Thread objects via a Thread/get call
 */
export type ThreadGetRequestInvocationArgs = BaseGetRequestInvocationArgs<ThreadObject>;

/**
 * The response to a `Thread/get` call
 */
export type ThreadGetResponseInvocationArgs = BaseGetResponseInvocationArgs<ThreadObject>;

/**
 * The arguments for fetching Thread changes via a `Thread/changes` call
 */
export type ThreadChangesRequestInvocationArgs = BaseChangesRequestInvocationArgs;

/**
 * The response to a `Thread/changes` call
 */
export type ThreadChangesResponseInvocationArgs = BaseChangesResponseInvocationArgs;

/**
 * Union type of all Thread capability request invocation arguments
 */
export type ThreadRequestInvocationArgs = ThreadGetRequestInvocationArgs | ThreadChangesRequestInvocationArgs;

/**
 * Union type of all Thread capability response invocation arguments
 */
export type ThreadResponseInvocationArgs = ThreadGetResponseInvocationArgs | ThreadChangesResponseInvocationArgs;
