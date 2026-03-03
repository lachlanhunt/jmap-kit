import { EMAIL_CAPABILITY_URI, EmailCapability, Mailbox } from "../../src/index.js";
import { createExampleClient } from "../utils/env.js";

/*
 * Find the inbox mailbox using Mailbox/query with a role filter.
 *
 * Mailbox/query returns matching IDs. Filtering by `role: "inbox"` is the
 * standard way to locate the inbox without knowing its server-assigned ID.
 */

const client = await createExampleClient({ capabilities: [EmailCapability] });

const accountId = client.primaryAccounts[EMAIL_CAPABILITY_URI];
if (!accountId) {
    throw new Error("No primary mail account found.");
}

const request = client.createRequestBuilder().add(
    Mailbox.request.query({
        accountId,
        filter: { role: "inbox" },
    }),
);

const response = await request.send();

await response.methodResponses.dispatch({
    "Mailbox/query": (invocation: ReturnType<typeof Mailbox.response.query>) => {
        const ids = invocation.arguments.ids;
        console.log("Inbox ID:", ids[0] ?? "(not found)");
        console.log("Total matching:", ids.length);
    },
});

await client.disconnect();
