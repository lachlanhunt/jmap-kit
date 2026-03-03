---
title: Email Operations
---

# Email Operations Examples

These examples demonstrate real-world email workflows using the Email capability. Each file is self-contained and focuses on a single operation.

## Prerequisites

- Node.js
- A JMAP server with email support and a bearer token

## Setup

Create a `.env` file in the repo root or export these variables in your shell:

```
JMAP_BEARER_TOKEN=your-token
JMAP_HOSTNAME=api.fastmail.com
JMAP_LOG_LEVEL=info
```

## Files

Clone the [jmap-kit](https://github.com/lachlanhunt/jmap-kit) repository and run from the repo root.

### list-mailboxes.ts

Lists every mailbox in the account by sending `Mailbox/get` with `ids: null`.

```
yarn tsx examples/email-operations/list-mailboxes.ts
```

### find-inbox.ts

Finds the inbox using `Mailbox/query` with `filter: { role: "inbox" }`.

```
yarn tsx examples/email-operations/find-inbox.ts
```

### query-emails.ts

Queries the 5 most recent inbox emails and fetches their details in a single request using a result reference to chain `Email/query` → `Email/get`.

```
yarn tsx examples/email-operations/query-emails.ts
```

## Key Concepts

### Fetching All Objects

Passing `ids: null` to a `/get` method retrieves all objects of that type (subject to server limits). This is practical for mailboxes where the total count is typically small.

### Query Filters

`Mailbox/query` and `Email/query` accept a `filter` argument. Common filters include `role` for mailboxes and `inMailbox` for emails.

### Result References

`query-emails.ts` demonstrates the query-then-get pattern with a result reference:

```typescript
const emailQuery = Email.request.query({ accountId, ... });
const emailGet = Email.request.get({
    accountId,
    ids: emailQuery.createReference("/ids"),
    properties: ["id", "subject", "from", "receivedAt", "preview"],
});
```

The server resolves the reference automatically — no client-side chaining needed.
