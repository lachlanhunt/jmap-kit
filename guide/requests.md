---
title: Building Requests
---

# Building Requests

A JMAP request bundles one or more method calls (invocations) into a single HTTP POST to the server. The `RequestBuilder` handles assembling invocations, managing IDs, populating the `using` set, and running validation and transformation plugins before sending.

## Creating a request builder

```typescript
const request = client.createRequestBuilder();
```

The builder is linked to the client and has access to its capabilities, session state, and server limits.

## Adding and removing invocations

Use `add()` to include invocations. It is chainable:

```typescript
import { Mailbox, Email } from "jmap-kit";

const request = client
    .createRequestBuilder()
    .add(Mailbox.request.get({ accountId }))
    .add(Email.request.get({ accountId, ids: ["msg1"] }));
```

`add()` validates that:

- The invocation's capability is registered with the client
- Adding it would not exceed the server's `maxCallsInRequest` limit

Adding the same invocation instance twice is a no-op. To remove an invocation:

```typescript
const inv = Mailbox.request.get({ accountId });
request.add(inv);
request.remove(inv);
```

## The `using` set

The `using` property returns the set of capability URIs that will be included in the request. It is automatically populated based on the invocations added:

```typescript
console.log(request.using);
// Set { "urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail" }
```

The Core capability URI is always included.

## ID management

Internally, each invocation is identified by a unique symbol. When the request is built, these symbols are mapped to string IDs (e.g. `"id_0"`, `"id_1"`) for the wire format.

The mappings are available via:

- `request.idMap` — `Map<symbol, string>` mapping invocation symbols to string IDs
- `request.reverseIdMap` — `Map<string, symbol>` mapping string IDs back to symbols

These are useful for correlating responses back to specific invocations. The ID mapping is idempotent — rebuilding the same request produces the same string IDs.

## Created IDs

JMAP allows passing a `createdIds` map in the request, mapping client-specified creation IDs to server-assigned IDs from a previous response. This is useful for multi-step workflows where a second request needs to reference objects created in a first request.

```typescript
// After a first request that created objects:
const firstResponse = await firstRequest.send();

// Pass the server-assigned IDs to the next request:
const secondRequest = client.createRequestBuilder();
secondRequest.addCreatedIds(firstResponse.createdIds);
// ... add invocations that reference the created objects
```

Use `clearCreatedIds()` to remove any previously added mappings.

## Inspecting the request

Call `build()` to see the raw `JMAPRequest` object that would be sent:

```typescript
const raw = request.build();
console.dir(raw, { depth: 5 });
// {
//   using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
//   methodCalls: [
//     ["Mailbox/get", { accountId: "abc123" }, "id_0"],
//     ...
//   ]
// }
```

This is useful for debugging and logging. `build()` triggers ID assignment, so `idMap` is populated after calling it.

## Sending the request

There are two equivalent ways to send:

```typescript
// Via the builder (preferred)
const response = await request.send();

// Via the client
const response = await client.sendAPIRequest(request);
```

Both accept an optional `AbortSignal` for cancellation:

```typescript
const controller = new AbortController();
const response = await request.send(controller.signal);
```

### What happens when you send

1. All invocations are validated against registered invocation-level validators
2. The request is built (IDs assigned, result references resolved)
3. Pre-build validators run on the constructed `JMAPRequest`
4. Pre-serialisation transformers are applied
5. Pre-serialisation validators run
6. The request is serialised to JSON
7. Post-serialisation transformers are applied (e.g. compression, header modifications)
8. Post-serialisation validators run (e.g. max request size check)
9. The serialised request is sent via the client's transport

If any validation step fails, an `AggregateError` is thrown containing the individual validation errors. The request is not sent.

## Server limits

The following limits from the server's core capabilities are enforced:

- **`maxCallsInRequest`** — checked when adding invocations and during pre-build validation
- **`maxObjectsInGet`** — checked during invocation validation for `/get` calls
- **`maxObjectsInSet`** — checked during invocation validation for `/set` calls
- **`maxSizeRequest`** — checked during post-serialisation validation against the serialised body size
- **`accountReadOnly`** — checked during invocation validation for `/set` calls

These validations run automatically when you send. See [Plugins](plugins.md) for details on validation plugins.
