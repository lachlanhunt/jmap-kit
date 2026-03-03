import { EMAIL_CAPABILITY_URI, Email, EmailCapability, Mailbox } from "../../src/index.js";
import { createExampleClient } from "../utils/env.js";

/*
 * Query recent emails and fetch their details in a single request.
 *
 * This uses a result reference to chain Email/query → Email/get: the server
 * resolves the reference automatically, so only one round-trip is needed.
 * This is the most common pattern for fetching JMAP data efficiently.
 */

const client = await createExampleClient({ capabilities: [EmailCapability] });

const accountId = client.primaryAccounts[EMAIL_CAPABILITY_URI];
if (!accountId) {
    throw new Error("No primary mail account found.");
}

// First, find the inbox ID
const inboxRequest = client.createRequestBuilder().add(Mailbox.request.query({ accountId, filter: { role: "inbox" } }));

const inboxResponse = await inboxRequest.send();
let inboxId: string | undefined;

await inboxResponse.methodResponses.dispatch({
    "Mailbox/query": (invocation: ReturnType<typeof Mailbox.response.query>) => {
        inboxId = invocation.arguments.ids[0];
    },
});

if (!inboxId) {
    console.log("Could not find inbox.");
    await client.disconnect();
    process.exit(0);
}

console.log("Inbox ID:", inboxId);

// Query the 5 most recent emails and fetch their details in one request
const emailQuery = Email.request.query({
    accountId,
    filter: { inMailbox: inboxId },
    sort: [{ property: "receivedAt", isAscending: false }],
    limit: 5,
});

const emailGet = Email.request.get({
    accountId,
    ids: emailQuery.createReference("/ids"),
    properties: ["id", "subject", "from", "receivedAt", "preview"],
});

const request = client.createRequestBuilder().add(emailQuery).add(emailGet);

// Show the built request for educational purposes
console.log("\nRequest body:");
console.dir(request.build(), { depth: 5 });

const response = await request.send();

await response.methodResponses.dispatch({
    "Email/query": (invocation: ReturnType<typeof Email.response.query>) => {
        console.log(`\nQuery matched ${invocation.arguments.ids.length} email(s)`);
    },
    "Email/get": (invocation: ReturnType<typeof Email.response.get>) => {
        const emails = invocation.arguments.list;

        if (emails.length === 0) {
            console.log("No emails found.");
            return;
        }

        console.log(`Fetched ${emails.length} email(s):\n`);

        console.table(
            emails.map((e) => {
                const from = e.from?.[0];
                const fromStr = from ? (from.name ? `${from.name} <${from.value}>` : from.value) : "(unknown)";

                return {
                    subject: e.subject ?? "(no subject)",
                    from: fromStr,
                    received: e.receivedAt,
                    preview: e.preview ? `${e.preview.slice(0, 60)}...` : "",
                };
            }),
        );
    },
});

await client.disconnect();
