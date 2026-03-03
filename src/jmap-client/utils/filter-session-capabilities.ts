import type { JMAPCapability } from "../../common/types.js";
import type { JMAPSession, JMAPSessionFromSchema } from "../types.js";
import { deepFreeze } from "./deep-freeze.js";

/**
 * Construct a new session object with invalid capabilities filtered out, then deep-freeze it.
 *
 * - Server-level failures cause the capability to be removed from `capabilities`,
 *   all `account.accountCapabilities`, and `primaryAccounts`.
 * - Account-level failures cause the capability to be removed from that specific
 *   account's `accountCapabilities` and, if the account was the primary for that
 *   capability, from `primaryAccounts`.
 *
 * @param session The parsed (mutable) session from structural validation
 * @param serverFailures Server capabilities that failed schema validation
 * @param accountFailures Account capabilities that failed schema validation
 * @returns A deeply frozen JMAPSession with invalid capabilities removed
 */
export function filterSessionCapabilities(
    session: JMAPSessionFromSchema,
    serverFailures: { uri: JMAPCapability }[],
    accountFailures: { uri: JMAPCapability; accountId: string }[],
): JMAPSession {
    const invalidServerUris = new Set(serverFailures.map((f) => f.uri));

    // Build lookup: accountId → Set<uri> for account-level failures
    const accountFailuresByAccount = Map.groupBy(accountFailures, (f) => f.accountId);
    const isInvalidAccountUri = (accountId: string, uri: string): boolean =>
        accountFailuresByAccount.get(accountId)?.some((f) => f.uri === uri) ?? false;

    // Filter server capabilities
    const capabilities = Object.fromEntries(
        Object.entries(session.capabilities).filter(([uri]) => !invalidServerUris.has(uri)),
    );

    // Filter account capabilities
    const accounts = Object.fromEntries(
        Object.entries(session.accounts).map(([accountId, account]) => [
            accountId,
            {
                ...account,
                accountCapabilities: Object.fromEntries(
                    Object.entries(account.accountCapabilities).filter(
                        ([uri]) => !invalidServerUris.has(uri) && !isInvalidAccountUri(accountId, uri),
                    ),
                ),
            },
        ]),
    );

    // Filter primaryAccounts
    const primaryAccounts = Object.fromEntries(
        Object.entries(session.primaryAccounts).filter(
            ([uri, accountId]) => !invalidServerUris.has(uri) && !isInvalidAccountUri(accountId, uri),
        ),
    );

    return deepFreeze({
        ...session,
        capabilities,
        accounts,
        primaryAccounts,
    }) as JMAPSession;
}
