---
title: Response Dispatch
---

# Response Dispatch Example

This example demonstrates all the ways to handle responses from an `InvocationList` returned by `request.send()`.

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
yarn tsx examples/response-dispatch/response-dispatch.ts
```

## What It Does

Sends 3 `Core/echo` invocations with distinct symbol IDs and demonstrates every dispatch mode:

1. **Dispatch by symbol ID** — handles a specific invocation by its symbol
2. **Dispatch by method name** — handles all `"Core/echo"` responses with a single handler
3. **Dispatch by data type** — handles all `"Core"` responses
4. **Error handler** — the `error` property on the handler map (fires for server-returned errors)
5. **Default handler** — the second argument to `dispatch()` (catches unmatched invocations)
6. **Manual iteration** — `for...of` loop with the `isErrorInvocation()` type guard

## Handler Priority

When dispatching, the library checks handlers in this order:

1. **Symbol ID** (`handlers[invocation.id]`) — highest priority
2. **Method name** (`handlers["Core/echo"]`)
3. **Data type** (`handlers["Core"]`)
4. **Default handler** (second argument to `dispatch()`)

The first matching handler wins. If none match, the invocation is skipped (logged in dev mode).

## Notes

- `Core/echo` always succeeds, so the `error` handler won't fire in this example. It would fire for server-returned errors like `"unknownMethod"` or `"invalidArguments"`.
- `dispatch()` can be called multiple times on the same response — it iterates the stored array without consuming it.
- The `isErrorInvocation()` type guard narrows the type to `ErrorInvocation`, giving access to `.type` and `.arguments`.
