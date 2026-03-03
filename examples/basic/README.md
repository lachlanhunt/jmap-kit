---
title: Basic
---

# Basic Example

This example demonstrates the fundamentals of using jmap-kit by connecting to a JMAP server and sending multiple `Core/echo` invocations in a single request.

## Prerequisites

- Node.js
- A JMAP server and a bearer token

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
yarn tsx examples/basic/basic.ts
```

## What It Does

- Validates environment variables using Zod for type safety
- Creates a `JMAPClient` with the fetch transport
- Connects via `/.well-known/jmap` on the host
- Displays session information (capabilities, accounts, endpoints)
- Builds a request with two batched `Core/echo` invocations
- Shows the request body and ID mappings for debugging
- Sends the request and dispatches responses with type safety
- Demonstrates dispatch by invocation ID and by method name (ID handlers take precedence)
- Uses a custom logger with colored output and configurable log level
- Properly disconnects to clean up resources

## JMAP JSON

The example builds a request with two `Core/echo` invocations. The serialised request body looks like:

```json
{
    "using": ["urn:ietf:params:jmap:core"],
    "methodCalls": [
        ["Core/echo", { "arg1": "Hello", "arg2": "World" }, "id_0"],
        [
            "Core/echo",
            {
                "count": 3,
                "tags": ["demo", "core", "echo"],
                "nested": {
                    "enabled": true,
                    "note": "You can pass any JSON-serializable data to echo requests."
                }
            },
            "id_1"
        ]
    ]
}
```

The `Core/echo` method simply echoes the arguments back unchanged, making it useful for testing the request/response lifecycle without side effects.

## Notes

- `JMAP_HOSTNAME` defaults to `api.fastmail.com` if unset
- `JMAP_LOG_LEVEL` can be: `debug`, `log`, `info`, `warn`, `error`, or `silent`
- This example is intentionally verbose and educational, showing internal mechanisms like ID mapping
- For a production application, you wouldn't typically log request bodies or ID maps
