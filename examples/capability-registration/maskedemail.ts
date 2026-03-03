import { MASKED_EMAIL_CAPABILITY_URI, MaskedEmailCapability } from "../../src/index.js";
import { createExampleClient } from "../utils/env.js";

/*
 * Registering capabilities allows the client to recognise and validate invocations for that
 * capability, and ensures that any validation and transformation plugins associated with the
 * capability are included in the request processing pipeline.
 *
 * This architecture allows for the client to be extended with support for new capabilities
 * and ensures that your application only includes code for capabilities that you need.
 *
 * Here we pass MaskedEmailCapability so it is registered before the client connects.
 */
const client = await createExampleClient({ capabilities: [MaskedEmailCapability] });

/*
 * Convenient reference to the capability's request invocation factories.
 */
const { MaskedEmail } = MaskedEmailCapability.invocations;

/*
 * Use the primary account for the Masked Email capability, if available, otherwise fall back to the
 * first account available that advertises support for the MaskedEmail capability.
 */
const maskedEmailAccountId = client.primaryAccounts[MASKED_EMAIL_CAPABILITY_URI];
const accountId =
    maskedEmailAccountId ??
    Object.entries(client.accounts ?? {}).find(
        ([, account]) => account.accountCapabilities[MASKED_EMAIL_CAPABILITY_URI],
    )?.[0];

if (!accountId) {
    /*
     * This error means that the authenticated session does not have any accounts that support the
     * MaskedEmail capability. If you see this error and did not expect it, ensure that the
     * FastMail API token you are using has been granted the MaskedEmail capability.
     */
    throw new Error("No account available to perform MaskedEmail/get.");
}

const account = client.accounts?.[accountId];

console.log("\n== Selected Account ==");
console.log(`Account ID: ${accountId}`);
if (account) {
    console.log(`Name: ${account.name}`);
    console.log(`Personal: ${account.isPersonal}`);
    console.log(`Read-only: ${account.isReadOnly}`);
    console.log(`Capabilities: ${Object.keys(account.accountCapabilities).join(", ")}\n`);
}

// Build a MaskedEmail/get request. Passing `ids: null` requests all masked emails.
const request = client.createRequestBuilder().add(
    MaskedEmail.request.get({
        accountId,
        ids: null,
        properties: [
            // Request a small set of properties for display.
            "id",
            "email",
            "state",
        ],
    }),
);

const response = await request.send();

await response.methodResponses.dispatch({
    // ReturnType resolves to the invocation response type for MaskedEmail/get.
    "MaskedEmail/get": (invocation: ReturnType<typeof MaskedEmail.response.get>) => {
        const list = invocation.arguments.list;
        console.log(`\nMasked emails returned: ${list.length}\n`);

        console.table(list);
    },
});

await client.disconnect();
