import { EMAIL_CAPABILITY_URI, EmailCapability, Mailbox } from "../../src/index.js";
import { createExampleClient } from "../utils/env.js";

/*
 * This example demonstrates result references and multi-method requests.
 *
 * It sends a Mailbox/query to find the inbox, then a Mailbox/get that references
 * the query results — both in a single JMAP request. The server resolves the
 * reference automatically, so only one round-trip is needed.
 */

const client = await createExampleClient({ capabilities: [EmailCapability] });

const accountId = client.primaryAccounts[EMAIL_CAPABILITY_URI];

if (!accountId) {
    throw new Error("No primary mail account found.");
}

const logSection = (title: string) => {
    console.log(`\n== ${title} ==`);
};

/*
 * Step 1: Create a Mailbox/query invocation to find the inbox.
 */
const mailboxQuery = Mailbox.request.query({
    accountId,
    filter: { role: "inbox" },
});

/*
 * Step 2: Create a Mailbox/get invocation whose `ids` argument is a result
 * reference pointing at the query's response `/ids` property.
 *
 * When the server processes this request, it will substitute the actual IDs
 * returned by the query into the get call — no client-side chaining needed.
 */
const mailboxGet = Mailbox.request.get({
    accountId,
    ids: mailboxQuery.createReference("/ids"),
    properties: ["id", "name", "role", "totalEmails", "unreadEmails"],
});

/*
 * Step 3: Build the request with both invocations.
 * The builder automatically determines the `using` set from the registered
 * capabilities and assigns unique method call IDs.
 */
const request = client.createRequestBuilder().add(mailboxQuery).add(mailboxGet);

/*
 * Inspect the serialised request body.
 * Notice how the Mailbox/get `ids` argument is serialised as `#ids` with
 * `resultOf` and `name` fields pointing back at the query invocation.
 */
logSection("Request");
console.dir(request.build(), { depth: 5 });

/*
 * The ID map shows how the library maps internal symbol IDs to the string
 * IDs used in the JMAP protocol (e.g., id_0, id_1).
 */
logSection("ID Map");
console.log("ID Map:", Array.from(request.idMap.entries()));

/*
 * Step 4: Send the request and dispatch typed responses.
 */
const response = await request.send();

await response.methodResponses.dispatch({
    "Mailbox/query": (invocation: ReturnType<typeof Mailbox.response.query>) => {
        logSection("Mailbox/query Response");
        console.log("Matching IDs:", invocation.arguments.ids);
        console.log("Total:", invocation.arguments.total);
    },
    "Mailbox/get": (invocation: ReturnType<typeof Mailbox.response.get>) => {
        logSection("Mailbox/get Response");

        for (const mailbox of invocation.arguments.list) {
            console.log(`  ${mailbox.name} (${mailbox.role ?? "no role"})`);
            console.log(`    Total emails: ${mailbox.totalEmails}, Unread: ${mailbox.unreadEmails}`);
        }
    },
});

await client.disconnect();
