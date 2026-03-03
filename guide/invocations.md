---
title: Invocations
---

# Invocations & Result References

## Invocations

An invocation represents a single JMAP method call — for example, `Mailbox/get` or `Email/set`. Invocations are created using type-safe factory functions and added to a request builder.

### Creating invocations

Each data type exports a factory object with `request` and `response` sub-objects. Use the `request` factories to create method calls:

```typescript
import { Mailbox, Email } from "jmap-kit";

const getMailboxes = Mailbox.request.get({
    accountId: "abc123",
    ids: null, // fetch all
    properties: ["id", "name", "role"],
});

const getEmails = Email.request.get({
    accountId: "abc123",
    ids: ["msg1", "msg2"],
});
```

Each factory enforces the correct argument types for that method. For example, `Mailbox.request.get` only accepts properties that exist on `MailboxObject`, and passing an invalid property name is a compile-time error.

### Invocation properties

Every invocation instance has the following properties:

| Property    | Type             | Description                                   |
| ----------- | ---------------- | --------------------------------------------- |
| `name`      | `string`         | The full method name (e.g. `"Mailbox/get"`)   |
| `dataType`  | `string`         | The data type name (e.g. `"Mailbox"`)         |
| `method`    | `string`         | The method name (e.g. `"get"`)                |
| `uri`       | `JMAPCapability` | The capability URI this invocation belongs to |
| `id`        | `symbol`         | A unique identifier for this method call      |
| `arguments` | `TArgs`          | A live, typed proxy over the method arguments |

### Working with arguments

The `arguments` property returns a fully typed, live view of the invocation's arguments. You can read, write, and delete arguments using standard property access:

```typescript
const inv = Mailbox.request.get({
    accountId: "abc123",
    ids: ["id1", "id2"],
});

// Read arguments — fully typed with autocompletion
inv.arguments.accountId; // "abc123"
inv.arguments.ids; // ["id1", "id2"]

// Write arguments — delegates to setArgument(), including validation
inv.arguments.ids = ["id3"];

// Delete arguments
delete inv.arguments.ids;

// Check if an argument exists
"ids" in inv.arguments; // false
```

The proxy is a live view of the underlying arguments, so changes made through it are immediately visible everywhere, and vice versa. It also works with standard JavaScript idioms:

```typescript
// Object.keys() returns the argument names
Object.keys(inv.arguments); // ["accountId"]

// Spread into a plain object
const copy = { ...inv.arguments };

// JSON serialisation
JSON.stringify(inv.arguments);

// Vitest/Jest matchers
expect(inv.arguments).toEqual({ accountId: "abc123" });
expect(inv.arguments).toMatchObject({ accountId: "abc123" });
```

#### Method-based API

Explicit `getArgument`, `setArgument`, `hasArgument`, and `deleteArgument` methods are also available. These are equivalent to the property access syntax above, but can be useful when working with dynamic argument names:

```typescript
const inv = Mailbox.request.get({ accountId: "abc123" });

inv.hasArgument("ids"); // false
inv.getArgument("accountId"); // "abc123"
inv.setArgument("ids", ["id1", "id2"]);
inv.deleteArgument("ids");
```

### Custom method call IDs

By default, each invocation gets a unique symbol as its ID. You can provide your own symbol to identify specific invocations when dispatching responses:

```typescript
const myId = Symbol("my-mailbox-get");
const inv = Mailbox.request.get({ accountId: "abc123" }, myId);

// Later, in the response dispatch:
await response.methodResponses.dispatch({
    [myId]: (invocation) => {
        // This handler runs only for the invocation with this specific ID
    },
});
```

### The `InvocationArgs<T>` wrapper

All invocation argument properties accept either their defined type or a `ResultReference`. This is handled by the `InvocationArgs<T>` type wrapper, which maps every property `K` of `T` to `T[K] | ResultReference`. You don't need to interact with this directly — just pass normal values or result references as needed.

## Result references

Result references (defined in [RFC 8620 Section 3.7](https://www.rfc-editor.org/rfc/rfc8620.html#section-3.7)) allow one method call to use the output of a previous method call in the same request. This avoids round trips for dependent operations.

### Creating a result reference

Call `createReference(path)` on any invocation. The `path` is a JSON Pointer ([RFC 6901](https://www.rfc-editor.org/rfc/rfc6901.html)) that selects a value from the referenced invocation's response:

```typescript
const ref = someInvocation.createReference("/ids");
```

### Example: chaining query and get

A common pattern is querying for IDs, then fetching the full objects in the same request:

```typescript
import { Mailbox } from "jmap-kit";

const query = Mailbox.request.query({
    accountId: "abc123",
    filter: { role: "inbox" },
});

const get = Mailbox.request.get({
    accountId: "abc123",
    // Use the query results as the ids argument
    ids: query.createReference("/ids"),
});

const request = client.createRequestBuilder();
request.add(query).add(get);

const response = await request.send();
```

When the request is serialised, the library replaces the result reference with the JMAP wire format:

```json
{
    "#ids": {
        "resultOf": "id_0",
        "name": "Mailbox/query",
        "path": "/ids"
    }
}
```

The `resultOf` value is resolved automatically from the invocation's internal symbol ID to the string ID assigned during serialisation. You do not need to manage string IDs yourself.

### How resolution works

1. Each invocation has a symbol ID assigned at creation time
2. When `build()` is called on the request builder, string IDs (e.g. `"id_0"`, `"id_1"`) are generated and mapped to the symbols
3. Result references are resolved by looking up the referenced invocation's symbol in the ID map
4. The argument key is prefixed with `#` (e.g. `ids` becomes `#ids`) and the value is replaced with a `{ resultOf, name, path }` object

If a result reference points to an invocation that is not in the same request, resolution throws an error.
