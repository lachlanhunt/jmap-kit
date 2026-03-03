import "dotenv/config";
import { z } from "zod";
import { CoreCapability, JMAPClient } from "../../src/index.js";
import { createFetchTransport } from "../utils/fetch-transport.js";
import { createExampleLogger } from "../utils/logger.js";

// Validate environment variables using Zod for type safety and runtime validation.
const envSchema = z.object({
    JMAP_BEARER_TOKEN: z.string().min(1, "Bearer token is required"),
    JMAP_HOSTNAME: z.string().default("api.fastmail.com"),
    JMAP_LOG_LEVEL: z.enum(["debug", "info", "log", "warn", "error", "silent"]).default("info"),
});

const env = envSchema.parse(process.env);

/*
 * Create a Fetch-based transport. It attaches the bearer token as an Authorization header.
 * Applications can use any transport and auth scheme they like by implementing the Transport interface.
 */
const transport = createFetchTransport({ bearerToken: env.JMAP_BEARER_TOKEN });

/*
 * Create a logger with a configurable minimum level (defaults to "info").
 * It is passed to the client for lifecycle and debug output.
 * This example logger will log messages to the console with colored prefixes indicating the log level.
 *
 * Custom loggers may write output to files or external logging services, and can be configured to
 * include additional context.
 */
const logger = createExampleLogger(env.JMAP_LOG_LEVEL);

// Create the client. It handles session discovery, request building, and response parsing.
const client = new JMAPClient(transport, { hostname: env.JMAP_HOSTNAME, logger });

/*
 * Connect loads the JMAP session by calling `/.well-known/jmap` on the host.
 * The session includes account info, capabilities, and server limits.
 * The client uses this information to configure itself and ensure it interacts correctly with
 * the server.
 */
await client.connect();

const logSection = (title: string) => {
    console.log(`\n== ${title} ==`);
};

/*
 * After connecting, the client maintains information about the session. The session data
 * is exposed for you to use to configure your application. (e.g., supported capabilities and
 * available accounts).
 */
logSection("Session Overview");
console.log("Capabilities:");
Object.keys(client.serverCapabilities ?? {}).forEach((capability) => {
    console.log("-", capability);
});
console.log("Accounts:");
console.dir(client.accounts, { depth: 5 });
console.log("Username:", client.username);

logSection("JMAP Endpoints");
console.log("API URL:", client.apiUrl);
console.log("Download URL:", client.downloadUrl);
console.log("Upload URL:", client.uploadUrl);
console.log("Event Source URL:", client.eventSourceUrl);

/*
 * Get the Core invocation factories. The Core capability is always supported by JMAP servers.
 * Capabilities provide type-safe factory functions for constructing invocations.
 */
const { Core } = CoreCapability.invocations;

// Build a request with two Core/echo invocations.
// Keep references to the method call IDs so we can correlate responses later.
const firstEchoId = Symbol("first");
const secondEchoId = Symbol("second");

const request = client
    // A request builder makes it easy to batch multiple method calls.
    .createRequestBuilder()
    .add(
        /* We construct a Core/echo invocation using the factory function provided by Core capability.
         *
         * Note: You do not need to manually specify the ID of each method call. The library will handle it for you.
         * But for illustration purposes, this has been done so that each ID can be easily identified in the logs.
         *
         * Internally, the IDs are represented as unique symbols, which guarantees uniqueness without collisions.
         * But when the request is built, they are converted to a string as expected by the JMAP protocol.
         * (e.g., "id_0", "id_1", etc).
         */
        Core.request.echo(
            {
                arg1: "Hello",
                arg2: "World",
            },
            firstEchoId,
        ),
    )
    // Add as many invocations as you like by chaining `add()`.
    .add(
        Core.request.echo(
            {
                count: 3,
                tags: ["demo", "core", "echo"],
                nested: {
                    enabled: true,
                    note: "You can pass any JSON-serializable data to echo requests.",
                },
            },
            secondEchoId,
        ),
    );

/*
 * You can inspect the request body before sending (useful for learning or debugging).
 * Notice how the method call IDs are automatically generated at build time as id_0, id_1, etc.
 */
logSection("Request");
console.log("JMAP Request Body:");
console.dir(request.build(), { depth: 5 });

/*
 * The request builder maps the symbol IDs to the string IDs in the built request.
 * This lets you correlate responses back to your original invocations.
 *
 * These mappings are used internally by the client to ensure that responses are correctly matched
 * to their corresponding requests.
 *
 * ID mapping is an idempotent operation for a given symbol, so rebuilding the request will produce
 * the same output.
 */
logSection("ID Map");
console.log("ID Map:", Array.from(request.idMap.entries()));
// The reverse ID map is also available
console.log("Reverse ID Map:", Array.from(request.reverseIdMap.entries()));

/*
 * Send the request to the server.
 *
 * The builder re-builds the request and runs validators and transformers before sending.
 * The Core Capability validators enforce session limits (e.g., maxCallsInRequest, maxObjectsInGet/Set)
 * and read-only account restrictions on `/set` methods, among others.
 *
 * The final serialised request is then sent by the client.
 */
const response = await request.send();

// Dispatch the response. The invocation argument is strongly typed.
await response.methodResponses.dispatch({
    /*
     * The dispatch method maps method IDs, names, or data types to handler functions.
     * Each handler receives the response invocation for that method call.
     *
     * ID handlers take precedence over name/data-type handlers, which is useful when you
     * have multiple calls to the same method and want distinct handling per call.
     */
    [firstEchoId]: (invocation: ReturnType<typeof Core.response.echo>) => {
        logSection("Echo Response (id_0)");

        /*
         * Invocation properties can be accessed via getters. The arguments are strongly typed based
         * on the method.
         */
        const arg1 = invocation.getArgument("arg1");

        /*
         * The arguments can also be accessed via the `arguments` property. This is also strongly
         * typed for most invocations (except Core/echo which is a special case that allows any
         * arguments).
         */
        const arg2 = invocation.arguments["arg2"];

        console.log("Response arguments:", arg1, arg2);
    },
    /*
     * Method-name handlers run when no ID handler matches, allowing one handler to cover
     * multiple calls to the same method.
     *
     * The system guarantees at runtime that the invocation type matches the handler,
     * so it is safe to strongly type the parameter based on the method name.
     *
     * Here, the `ReturnType<...>` resolves to the invocation type for the Core/echo response,
     * which is equivalent to `CoreInvocation<CoreEchoResponseInvocationArgs>`.
     */
    "Core/echo": (invocation: ReturnType<typeof Core.response.echo>) => {
        const requestId = request.idMap.get(invocation.id);
        logSection(`Echo Response (${requestId ?? "unknown"})`);
        console.log("Raw invocation tuple:");
        console.dir(invocation.toJSON(), { depth: 5 });
    },
});

// Disconnect to clear session state and cancel any in-flight requests.
await client.disconnect();
