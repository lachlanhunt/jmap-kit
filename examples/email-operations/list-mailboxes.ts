import { EMAIL_CAPABILITY_URI, EmailCapability, Mailbox } from "../../src/index.js";
import { createExampleClient } from "../utils/env.js";

/*
 * List all mailboxes in the primary mail account.
 *
 * Passing `ids: null` to Mailbox/get retrieves every mailbox. This is
 * practical because the total count is typically small (tens, not thousands).
 */

const client = await createExampleClient({ capabilities: [EmailCapability] });

const accountId = client.primaryAccounts[EMAIL_CAPABILITY_URI];
if (!accountId) {
    throw new Error("No primary mail account found.");
}

const request = client.createRequestBuilder().add(
    Mailbox.request.get({
        accountId,
        ids: null,
        properties: ["id", "name", "role", "totalEmails", "unreadEmails"],
    }),
);

const response = await request.send();

await response.methodResponses.dispatch({
    "Mailbox/get": (invocation: ReturnType<typeof Mailbox.response.get>) => {
        const mailboxes = invocation.arguments.list;
        console.log(`Found ${mailboxes.length} mailboxes:\n`);
        console.table(
            mailboxes.map((m) => ({
                name: m.name,
                role: m.role ?? "(none)",
                total: m.totalEmails,
                unread: m.unreadEmails,
            })),
        );
    },
});

await client.disconnect();
