import { Core, Email, Mailbox } from "../../src/index.js";

/*
 * This example demonstrates the Invocation object API — creating invocations,
 * inspecting their properties, and working with arguments and result references.
 *
 * No server connection is needed. Invocations are plain objects created by
 * factory functions; building a full JMAP request requires a client, but
 * creating and inspecting individual invocations does not.
 */

const logSection = (title: string) => {
    console.log(`\n== ${title} ==\n`);
};

// ---------------------------------------------------------------------------
// 1. Creating invocations via factory functions
// ---------------------------------------------------------------------------
logSection("1. Creating invocations");

const echo = Core.request.echo({ greeting: "Hello", count: 42 });
console.log("Created Core/echo invocation");

const mailboxGet = Mailbox.request.get({
    accountId: "account-1",
    ids: ["mbox-1", "mbox-2"],
    properties: ["id", "name", "role"],
});
console.log("Created Mailbox/get invocation");

const emailQuery = Email.request.query({
    accountId: "account-1",
    filter: { inMailbox: "inbox-id" },
    sort: [{ property: "receivedAt", isAscending: false }],
    limit: 10,
});
console.log("Created Email/query invocation");

// ---------------------------------------------------------------------------
// 2. Inspecting invocation properties
// ---------------------------------------------------------------------------
logSection("2. Invocation properties");

console.log("echo.name:            ", echo.name);
console.log("echo.dataType:        ", echo.dataType);
console.log("echo.method:          ", echo.method);
console.log("echo.id:              ", echo.id);
console.log("echo.uri:             ", echo.uri);

console.log();
console.log("mailboxGet.name:      ", mailboxGet.name);
console.log("mailboxGet.dataType:  ", mailboxGet.dataType);
console.log("mailboxGet.method:    ", mailboxGet.method);
console.log("mailboxGet.uri:       ", mailboxGet.uri);

// ---------------------------------------------------------------------------
// 3. Argument access (methods)
// ---------------------------------------------------------------------------
logSection("3. Argument access (methods)");

// Read arguments via getArgument()
console.log("echo.getArgument('greeting'):", echo.getArgument("greeting"));
console.log("echo.getArgument('count'):   ", echo.getArgument("count"));

// Modify an argument
echo.setArgument("greeting", "Goodbye");
console.log();
console.log("echo.setArgument('greeting', 'Goodbye')");
console.log("echo.getArgument('greeting'):", echo.getArgument("greeting"));

// Delete an argument
echo.deleteArgument("count");
console.log();
console.log("echo.deleteArgument('count')");
console.log("echo.hasArgument('count'):   ", echo.hasArgument("count"));
console.log("echo.argumentKeys():         ", echo.argumentKeys());

// ---------------------------------------------------------------------------
// 4. Argument access (proxy)
// ---------------------------------------------------------------------------
logSection("4. Argument access (proxy)");

// Read arguments via the .arguments proxy (property access)
console.log("mailboxGet.arguments.accountId:      ", mailboxGet.arguments.accountId);
console.log("mailboxGet.arguments.ids:            ", mailboxGet.arguments.ids);

// Check existence and list keys
console.log("mailboxGet.hasArgument('properties'):", mailboxGet.hasArgument("properties"));
console.log("mailboxGet.hasArgument('ids'):       ", mailboxGet.hasArgument("ids"));
console.log("mailboxGet.argumentKeys():           ", mailboxGet.argumentKeys());

// Delete an argument via the proxy
delete mailboxGet.arguments.ids;
console.log();
console.log("delete mailboxGet.arguments.ids");
console.log("mailboxGet.hasArgument('ids'):       ", mailboxGet.hasArgument("ids"));
console.log("mailboxGet.argumentKeys():           ", mailboxGet.argumentKeys());

// hasArgument returns false for optional keys that weren't set
console.log();
console.log("emailQuery.hasArgument('position'):  ", emailQuery.hasArgument("position"));

// ---------------------------------------------------------------------------
// 5. Custom symbol IDs
// ---------------------------------------------------------------------------
logSection("5. Custom symbol IDs");

// Passing a symbol as the second argument to a factory assigns a custom ID.
// This is useful for result referencing and dispatch handler matching.
const myId = Symbol("my-echo");
const echoWithId = Core.request.echo({ tag: "custom" }, myId);

console.log("echoWithId.id:            ", echoWithId.id);
console.log("echoWithId.id === myId:   ", echoWithId.id === myId);
console.log("echoWithId.id.description:", echoWithId.id.description);

// ---------------------------------------------------------------------------
// 6. Result references
// ---------------------------------------------------------------------------
logSection("6. Result references");

// Create a reference to the Email/query result's /ids path.
// This can be passed as an argument to another invocation so the server
// resolves it automatically — no client-side chaining needed.
const ref = emailQuery.createReference("/ids");

console.log("emailQuery.createReference('/ids')");
console.log("ref.name:", ref.name);
console.log("ref.path:", ref.path);

// Use the reference as the `ids` argument of Email/get
const emailGet = Email.request.get({
    accountId: "account-1",
    ids: ref,
    properties: ["id", "subject", "from", "receivedAt"],
});
console.log("emailGet uses a result reference for its 'ids' argument");

// ---------------------------------------------------------------------------
// 7. toJSON() — serialised representation
// ---------------------------------------------------------------------------
logSection("7. toJSON()");

// toJSON() returns the [name, arguments, methodCallId] tuple used internally.
// The methodCallId is a symbol (resolved to a string ID when building a request).
console.log("emailQuery.toJSON():");
console.dir(emailQuery.toJSON(), { depth: 5 });

// Result references are included in the arguments as-is (with symbol IDs) in the internal representation.
console.log("\nemailGet.toJSON() (with result reference):");
console.dir(emailGet.toJSON(), { depth: 5 });

// A simple echo invocation
const freshEcho = Core.request.echo({ hello: "world" });
console.log("\nfreshEcho.toJSON():");
console.dir(freshEcho.toJSON(), { depth: 5 });
