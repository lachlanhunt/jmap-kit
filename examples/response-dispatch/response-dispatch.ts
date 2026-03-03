import { CoreCapability, type Core } from "../../src/index.js";
import type { ErrorInvocation } from "../../src/invocation/error-invocation.js";
import { isErrorInvocation } from "../../src/invocation/utils.js";
import { createExampleClient } from "../utils/env.js";

/*
 * This example demonstrates all the ways to handle responses from an
 * InvocationList returned by request.send().
 *
 * It sends 3 Core/echo invocations with distinct symbol IDs and then
 * exercises every dispatch mode in sequence. Core/echo is used exclusively
 * so the focus stays on dispatch mechanics, not JMAP mail semantics.
 */

type EchoResponse = ReturnType<typeof Core.response.echo>;

const client = await createExampleClient();

const logSection = (title: string) => {
    console.log(`\n== ${title} ==\n`);
};

// Create 3 echo invocations with distinct symbol IDs
const firstId = Symbol("first");
const secondId = Symbol("second");
const thirdId = Symbol("third");

const { Core: CoreFactory } = CoreCapability.invocations;

const request = client
    .createRequestBuilder()
    .add(CoreFactory.request.echo({ source: "first", value: 1 }, firstId))
    .add(CoreFactory.request.echo({ source: "second", value: 2 }, secondId))
    .add(CoreFactory.request.echo({ source: "third", value: 3 }, thirdId));

const response = await request.send();
const { methodResponses } = response;

console.log("Received", methodResponses.size, "responses");

// ---------------------------------------------------------------------------
// 1. Dispatch by symbol ID — handle a specific invocation by its symbol
// ---------------------------------------------------------------------------
logSection("1. Dispatch by symbol ID");

await methodResponses.dispatch({
    [firstId]: (invocation: EchoResponse) => {
        console.log("  [firstId] matched:", invocation.getArgument("source"), invocation.getArgument("value"));
    },
    [secondId]: (invocation: EchoResponse) => {
        console.log("  [secondId] matched:", invocation.getArgument("source"), invocation.getArgument("value"));
    },
    [thirdId]: (invocation: EchoResponse) => {
        console.log("  [thirdId] matched:", invocation.getArgument("source"), invocation.getArgument("value"));
    },
});

// ---------------------------------------------------------------------------
// 2. Dispatch by method name — handle all "Core/echo" responses
// ---------------------------------------------------------------------------
logSection("2. Dispatch by method name");

await methodResponses.dispatch({
    "Core/echo": (invocation: EchoResponse) => {
        console.log("  [Core/echo] source=", invocation.getArgument("source"));
    },
});

// ---------------------------------------------------------------------------
// 3. Dispatch by data type — handle all "Core" responses
// ---------------------------------------------------------------------------
logSection("3. Dispatch by data type");

await methodResponses.dispatch({
    Core: (invocation: EchoResponse) => {
        console.log("  [Core]", invocation.name, "source=", invocation.getArgument("source"));
    },
});

// ---------------------------------------------------------------------------
// 4. Error handler — the `error` property
// ---------------------------------------------------------------------------
logSection("4. Error handler");

// The `error` handler fires when the server returns an error response for a
// method call (e.g., "unknownMethod", "invalidArguments", "serverFail").
// Core/echo always succeeds, so the error handler won't fire here.
// The default handler (second argument) catches everything else.
await methodResponses.dispatch(
    {
        error: (errorInvocation: ErrorInvocation) => {
            console.log("  [error] type=", errorInvocation.type);
            console.log("  [error] args:", errorInvocation.arguments);
        },
    },
    (invocation: EchoResponse) => {
        console.log("  [default]", invocation.name, "(no error in this example)");
    },
);

// ---------------------------------------------------------------------------
// 5. Default handler — second argument to dispatch()
// ---------------------------------------------------------------------------
logSection("5. Default handler");

// When no specific handler matches an invocation, the default handler is called.
await methodResponses.dispatch({}, (invocation: EchoResponse) => {
    console.log("  [default]", invocation.name, "source=", invocation.getArgument("source"));
});

// ---------------------------------------------------------------------------
// 6. Manual iteration — for...of with isErrorInvocation() type guard
// ---------------------------------------------------------------------------
logSection("6. Manual iteration");

for (const invocation of methodResponses) {
    if (isErrorInvocation(invocation)) {
        console.log("  Error:", invocation.type);
    } else {
        console.log(" ", invocation.name, `[${String(invocation.id.description)}]:`, invocation.getArgument("source"));
    }
}

await client.disconnect();
