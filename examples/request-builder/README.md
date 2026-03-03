---
title: Request Builder
---

# Request Builder Example

This example demonstrates how to build multi-method JMAP requests using the request builder, and how to reference the results of earlier invocations in later method calls using result references.

## Prerequisites

- Node.js
- A JMAP server with the Email capability (`urn:ietf:params:jmap:mail`)
- A bearer token

## Setup

Create a `.env` file in the repo root or export these variables in your shell:

```
JMAP_BEARER_TOKEN=your-token
JMAP_HOSTNAME=api.fastmail.com
JMAP_LOG_LEVEL=info
```

## Run

Clone the [jmap-kit](https://github.com/lachlanhunt/jmap-kit) repository, then from the repo root:

```
yarn tsx examples/request-builder/request-builder.ts
```

## What It Does

1. Connects to the JMAP server and registers the Email capability
2. Creates a `Mailbox/query` invocation to find the inbox
3. Creates a `Mailbox/get` invocation with a **result reference** to the query's IDs
4. Builds the request and logs the serialised JSON to show the result reference format
5. Sends the request and dispatches typed responses

## JMAP JSON

### Request

The built request contains two method calls. The `Mailbox/get` call uses a result reference (`#ids`) instead of literal IDs:

```json
{
    "using": ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    "methodCalls": [
        [
            "Mailbox/query",
            {
                "accountId": "u1234",
                "filter": { "role": "inbox" }
            },
            "id_0"
        ],
        [
            "Mailbox/get",
            {
                "accountId": "u1234",
                "#ids": {
                    "resultOf": "id_0",
                    "name": "Mailbox/query",
                    "path": "/ids"
                },
                "properties": ["id", "name", "role", "totalEmails", "unreadEmails"]
            },
            "id_1"
        ]
    ]
}
```

The `#ids` key tells the server to resolve the value from the `Mailbox/query` response at JSON Pointer `/ids` before processing the `Mailbox/get` call.

### Response

The server returns both results in a single response:

```json
{
    "methodResponses": [
        [
            "Mailbox/query",
            {
                "accountId": "u1234",
                "queryState": "50:0",
                "canCalculateChanges": false,
                "ids": ["M12345"],
                "position": 0,
                "total": 1
            },
            "id_0"
        ],
        [
            "Mailbox/get",
            {
                "accountId": "u1234",
                "state": "50",
                "list": [
                    {
                        "id": "M12345",
                        "name": "Inbox",
                        "role": "inbox",
                        "totalEmails": 42,
                        "unreadEmails": 3
                    }
                ],
                "notFound": []
            },
            "id_1"
        ]
    ]
}
```

## Key Concepts

- **Result references** — `invocation.createReference("/ids")` creates a reference that the server resolves at request time. This avoids a second round-trip to fetch dependent data.
- **ID management** — The request builder assigns string IDs (`id_0`, `id_1`, ...) at build time. Internal symbol IDs are mapped via `request.idMap`.
- **Automatic `using`** — The builder determines the `using` set from the capabilities of the invocations in the request. No manual capability URI management is needed.
- **Typed dispatch** — `response.methodResponses.dispatch(...)` routes each response to the correct handler based on method name or invocation ID, with full type safety.

## Notes

- `JMAP_HOSTNAME` defaults to `api.fastmail.com` if unset
- `JMAP_LOG_LEVEL` can be: `debug`, `log`, `info`, `warn`, `error`, or `silent`
- This example focuses on request construction and result references rather than mailbox-specific logic
