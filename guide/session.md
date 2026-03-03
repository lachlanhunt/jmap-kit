---
title: Session
---

# Session

After connecting, the client holds a JMAP session object that describes what the server supports and which accounts are available. This page explains how to access and use that information.

## Session properties

The session is fetched automatically during `client.connect()`. Its data is exposed through read-only properties on the client:

| Property             | Type                                  | When connected                               | When disconnected |
| -------------------- | ------------------------------------- | -------------------------------------------- | ----------------- |
| `serverCapabilities` | `JMAPServerCapabilities \| null`      | Server capability objects, keyed by URI      | `null`            |
| `accounts`           | `Record<Id, JMAPAccount> \| null`     | Accounts the user has access to, keyed by ID | `null`            |
| `primaryAccounts`    | `Partial<Record<JMAPCapability, Id>>` | Default account ID for each capability       | `{}`              |
| `username`           | `string`                              | The authenticated username                   | `""`              |
| `apiUrl`             | `string`                              | URL for JMAP API requests                    | `""`              |
| `downloadUrl`        | `string`                              | URL template for file downloads              | `""`              |
| `uploadUrl`          | `string`                              | URL template for file uploads                | `""`              |
| `eventSourceUrl`     | `string`                              | URL template for push event connections      | `""`              |

Always check the connection state or guard against `null`/empty values before using session data.

## Server capabilities and core limits

`serverCapabilities` is `null` when disconnected. When connected, it is an object keyed by capability URI. The core capability (`urn:ietf:params:jmap:core`) is always present and defines server limits:

```typescript
// serverCapabilities is null when disconnected — always guard access
const core = client.serverCapabilities?.["urn:ietf:params:jmap:core"];

if (core) {
    console.log("Max upload size:", core.maxSizeUpload);
    console.log("Max concurrent uploads:", core.maxConcurrentUpload);
    console.log("Max request size:", core.maxSizeRequest);
    console.log("Max concurrent requests:", core.maxConcurrentRequests);
    console.log("Max calls per request:", core.maxCallsInRequest);
    console.log("Max objects in /get:", core.maxObjectsInGet);
    console.log("Max objects in /set:", core.maxObjectsInSet);
}
```

These limits are enforced automatically by the library's built-in validators when sending requests.

The presence of other capability URIs (e.g. `urn:ietf:params:jmap:mail`) indicates that the server supports those capabilities. You can check this programmatically:

```typescript
import { EMAIL_CAPABILITY_URI } from "jmap-kit";

if (client.isSupported(EMAIL_CAPABILITY_URI)) {
    // Server supports mail capabilities
}
```

## Accounts

Each account represents a collection of data the user can access. An account has:

| Property              | Type                      | Description                                             |
| --------------------- | ------------------------- | ------------------------------------------------------- |
| `name`                | `string`                  | User-friendly display name (e.g. an email address)      |
| `isPersonal`          | `boolean`                 | `true` if the account belongs to the authenticated user |
| `isReadOnly`          | `boolean`                 | `true` if the entire account is read-only               |
| `accountCapabilities` | `JMAPAccountCapabilities` | Capability-specific settings for this account           |

### Listing accounts

`accounts` is `null` when disconnected, so always check before iterating:

```typescript
const accounts = client.accounts;
if (accounts) {
    for (const [id, account] of Object.entries(accounts)) {
        console.log(`${id}: ${account.name} (personal: ${account.isPersonal})`);
    }
}
```

### Finding the primary account for a capability

The `primaryAccounts` mapping gives you the default account ID for a given capability URI. When disconnected, `primaryAccounts` is an empty object `{}`, so lookups will return `undefined`:

```typescript
import { EMAIL_CAPABILITY_URI } from "jmap-kit";

const mailAccountId = client.primaryAccounts[EMAIL_CAPABILITY_URI];
if (mailAccountId) {
    // Use this account ID in your method calls
}
```

Not every capability will have a primary account mapping even when connected. If none is appropriate, the entry may be absent.

### Account capabilities

Each account's `accountCapabilities` object contains capability-specific configuration. For example, the mail capability provides limits like `maxMailboxesPerEmail`, `maxMailboxDepth`, and `maxSizeAttachmentsPerEmail`:

```typescript
import { EMAIL_CAPABILITY_URI } from "jmap-kit";

const mailAccountId = client.primaryAccounts[EMAIL_CAPABILITY_URI];
const account = mailAccountId ? client.accounts?.[mailAccountId] : null;
const mailCaps = account?.accountCapabilities[EMAIL_CAPABILITY_URI];

if (mailCaps) {
    console.log("Max attachment size:", mailCaps.maxSizeAttachmentsPerEmail);
    console.log("May create top-level mailbox:", mailCaps.mayCreateTopLevelMailbox);
}
```

## Capability validation

During `connect()`, the library validates capability data in the session against schemas provided by registered capabilities. This catches servers that return malformed or non-compliant capability data.

- If the **Core** server capability fails validation, the connection throws — the client cannot function without valid core limits (e.g. `maxObjectsInGet`, `maxSizeUpload`).
- If a **non-Core server** capability fails, it is stripped everywhere: from `serverCapabilities`, every account's `accountCapabilities`, and `primaryAccounts`.
- If an **account** capability fails, the stripping is scoped to that account. It is removed from that account's `accountCapabilities`, and from `primaryAccounts` only if that account was the primary for the capability. Other accounts that have valid data for the same capability are unaffected.

When capabilities are stripped, the client logs warnings and emits an `"invalid-capabilities"` event with `context: "connection"` (see [Customisation](customisation.md)):

```typescript
client.withEmitter((name, payload) => {
    if (name === "invalid-capabilities") {
        for (const failure of payload.serverCapabilities) {
            console.warn(`Server capability ${failure.uri} invalid:`, failure.errors);
        }
        for (const failure of payload.accountCapabilities) {
            console.warn(`Account capability ${failure.uri} (account ${failure.accountId}) invalid:`, failure.errors);
        }
    }
});
```

Capabilities without schemas pass through unvalidated. See [Capabilities](capabilities.md#session-capability-validation) for more details.

## Session staleness

Every JMAP API response includes a `sessionState` string. When this differs from the session state the client received during `connect()`, it means the session has changed on the server (e.g. an account was added or removed).

The client detects this automatically and emits a `"session-stale"` event:

```typescript
client.withEmitter((name, payload) => {
    if (name === "session-stale") {
        console.log("Session changed:", payload.oldSessionState, "->", payload.newSessionState);
        // Reconnect to refresh the session
    }
});
```

When you receive this event, you should reconnect to fetch the updated session. See [Customisation](customisation.md) for more on the event emitter.
