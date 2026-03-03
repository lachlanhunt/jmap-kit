---
title: Invocations
---

# Invocations Example

This example demonstrates the `Invocation` object API — creating invocations, inspecting their properties, working with arguments, and using result references.

**No server connection is needed.** Invocations are plain objects created by factory functions. Building a full JMAP request requires a client, but creating and inspecting individual invocations does not.

## Run

Clone the [jmap-kit](https://github.com/lachlanhunt/jmap-kit) repository, then from the repo root:

```
yarn tsx examples/invocations/invocations.ts
```

No `.env` file is required.

## What It Does

- **Creates invocations** via factory functions (`Core.request.echo()`, `Mailbox.request.get()`, `Email.request.query()`)
- **Inspects properties** — `.name`, `.dataType`, `.method`, `.id` (symbol), `.uri`
- **Accesses arguments** — `.arguments` proxy, `.getArgument()`, `.setArgument()`, `.deleteArgument()`, `.hasArgument()`, `.argumentKeys()`
- **Uses custom symbol IDs** — passes a symbol as the second argument to a factory
- **Creates result references** — `.createReference("/ids")` and inspects the `ResultReference` object
- **Serialises invocations** — `.toJSON()` shows the `[name, arguments, methodCallId]` tuple

## Key Concepts

### Factory Functions

Invocations are never constructed directly. Each capability exposes factory functions grouped under `request` and `response`:

```typescript
const echo = Core.request.echo({ greeting: "Hello" });
const mailboxGet = Mailbox.request.get({ accountId, ids: ["mbox-1"] });
```

### Arguments Proxy

The `.arguments` property returns a proxy that delegates to `getArgument()`/`setArgument()`/`deleteArgument()`:

```typescript
echo.arguments.greeting; // reads via getArgument("greeting")
echo.setArgument("key", 42); // writes directly
echo.deleteArgument("key"); // removes an argument
```

### Result References

`invocation.createReference(path)` creates a `ResultReference` that can be passed as an argument to another invocation. The server resolves it during request processing:

```typescript
const ref = emailQuery.createReference("/ids");
const emailGet = Email.request.get({ accountId, ids: ref });
```
