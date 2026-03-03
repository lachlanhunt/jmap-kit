import { EMAIL_CAPABILITY_URI, EmailCapability } from "../../src/index.js";
import { createExampleClient } from "../utils/env.js";
import { Widget, WidgetCapability, WIDGET_CAPABILITY_URI } from "./widget-capability.js";

/*
 * This example demonstrates how to use a custom JMAP capability with a client.
 *
 * It registers the WidgetCapability (defined in widget-capability.ts), builds
 * a request with Widget/get and Widget/set invocations, and inspects the
 * resulting request body.
 *
 * NOTE: The request is NOT sent to the server because no real JMAP server
 * supports the Widget capability. The purpose is to show that custom
 * capabilities integrate fully into the request pipeline — they get proper
 * `using` URIs, method call IDs, and validation.
 */

const logSection = (title: string) => {
    console.log(`\n== ${title} ==`);
};

// ---------------------------------------------------------------------------
// 1. Register the custom capability
// ---------------------------------------------------------------------------
logSection("1. Register WidgetCapability");

const client = await createExampleClient({
    capabilities: [EmailCapability, WidgetCapability],
});

console.log("Registered capabilities:");
console.log("  - EmailCapability");
console.log("  - WidgetCapability");

const accountId = client.primaryAccounts[EMAIL_CAPABILITY_URI];
if (!accountId) {
    throw new Error("No primary mail account found.");
}

// ---------------------------------------------------------------------------
// 2. Build a request with Widget invocations
// ---------------------------------------------------------------------------
logSection("2. Build a request");

const widgetGet = Widget.request.get({
    accountId,
    ids: null,
    properties: ["id", "name", "colour", "size"],
});

const widgetSet = Widget.request.set({
    accountId,
    create: {
        "new-widget-1": {
            id: "",
            name: "Blue Widget",
            colour: "blue",
            size: 42,
            createdAt: "",
        },
    },
});

const request = client.createRequestBuilder().add(widgetGet).add(widgetSet);

// ---------------------------------------------------------------------------
// 3. Inspect the built request body
// ---------------------------------------------------------------------------
logSection("3. Request body");

const builtRequest = request.build();

console.log("using:", builtRequest.using);
console.log(`  Includes Widget URI: ${builtRequest.using.includes(WIDGET_CAPABILITY_URI)}`);
console.log(`  Includes Core URI:   ${builtRequest.using.includes("urn:ietf:params:jmap:core")}`);
console.log();
console.dir(builtRequest, { depth: 5 });

// ---------------------------------------------------------------------------
// 4. ID mapping
// ---------------------------------------------------------------------------
logSection("4. ID mapping");

console.log(
    "ID Map:",
    [...request.idMap.entries()].map(([sym, id]) => `${sym.toString()} → ${id}`),
);

// ---------------------------------------------------------------------------
// 5. Invocation properties
// ---------------------------------------------------------------------------
logSection("5. Invocation properties");

console.log("widgetGet.name:    ", widgetGet.name); // "Widget/get"
console.log("widgetGet.dataType:", widgetGet.dataType); // "Widget"
console.log("widgetGet.method:  ", widgetGet.method); // "get"
console.log("widgetGet.uri:     ", widgetGet.uri); // "urn:example:jmap:widget"
console.log();
console.log("widgetSet.name:    ", widgetSet.name); // "Widget/set"
console.log("widgetSet.dataType:", widgetSet.dataType); // "Widget"
console.log("widgetSet.method:  ", widgetSet.method); // "set"
console.log("widgetSet.uri:     ", widgetSet.uri); // "urn:example:jmap:widget"

/*
 * At this point the request is fully built and validated — it would be ready
 * to send if a server supported the Widget capability. Since no server does,
 * we skip the send() call. The key takeaway is that custom capabilities work
 * exactly like built-in ones: they produce proper JMAP method calls, appear
 * in the `using` array, and run through the validation pipeline.
 */

console.log("\nDone — request built but not sent (no server supports Widget).");

await client.disconnect();
