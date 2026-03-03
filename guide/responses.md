---
title: Handling Responses
---

# Handling Responses

When a request is sent, the server returns a response containing the results of each method call. The response is parsed into an `InvocationList` that supports three approaches for processing: dispatch, manual iteration, and lookup by ID.

## Response structure

The object returned by `request.send()` has the following shape:

```typescript
const response = await request.send();

response.methodResponses; // InvocationList — the parsed method responses
response.sessionState; // string — current server session state
response.createdIds; // Record<Id, Id> — client-to-server ID mappings
```

## Method 1: dispatch()

The `dispatch()` method routes each response invocation to a matching handler function. This is the recommended approach for most use cases.

```typescript
await response.methodResponses.dispatch({
    // Handler by symbol ID — highest priority
    [myMailboxGetId]: (invocation: ReturnType<typeof Mailbox.response.get>) => {
        console.log("Mailboxes:", invocation.getArgument("list"));
    },

    // Handler by method name (e.g. "Email/get")
    "Email/get": (invocation: ReturnType<typeof Email.response.get>) => {
        console.log("Emails:", invocation.getArgument("list"));
    },

    // Handler by data type (e.g. "Thread") — see caveat below
    Thread: (invocation) => {
        console.log("Thread method:", invocation.method, invocation.arguments);
    },

    // Error handler — called for any error invocations
    error: (invocation) => {
        console.error("Error:", invocation.type, invocation.arguments);
    },
});
```

### Handler resolution order

For each response invocation, dispatch checks handlers in this order:

1. **By invocation symbol ID** — matches a specific method call you created
2. **By method name** — e.g. `"Mailbox/get"`, matches any invocation with that name
3. **By data type** — e.g. `"Mailbox"`, matches any method on that data type
4. **Error handler** — the `error` property, called for `ErrorInvocation` objects
5. **Default handler** — passed as the second argument to `dispatch()`

The first match wins. If no handler matches and no default is provided, the invocation is skipped.

### Caveat: implicit method calls and shared IDs

Some JMAP methods trigger implicit additional method calls whose responses share the same method call ID as the original. For example:

- **`Foo/copy`** with `onSuccessDestroyOriginal: true` — the server returns both a `Foo/copy` response and an implicit `Foo/set` response, both with the same method call ID (RFC 8620 Section 5.4)
- **`EmailSubmission/set`** with `onSuccessUpdateEmail` or `onSuccessDestroyEmail` — the server returns both an `EmailSubmission/set` response and an implicit `Email/set` response with the same method call ID (RFC 8621 Section 7.5)

This means a symbol ID handler may be called more than once — once for the original response and once for each implicit response. If you use ID-based dispatch for these methods, check the `name` property to determine which response you are handling:

```typescript
const submissionId = Symbol("send-email");
const inv = EmailSubmission.request.set(
    {
        /* ... */
    },
    submissionId,
);

await response.methodResponses.dispatch({
    [submissionId]: (invocation) => {
        if (invocation.name === "EmailSubmission/set") {
            // Handle the submission response
        } else if (invocation.name === "Email/set") {
            // Handle the implicit Email/set response
        }
    },
});
```

### Caveat: data type handlers match all methods

A handler keyed by data type (e.g. `"Thread"`) will receive **any** method response for that data type — not just `/get`. If your request includes both `Thread/get` and `Thread/changes`, the same handler receives both. You must check the `method` property before assuming a specific response shape:

```typescript
await response.methodResponses.dispatch({
    Thread: (invocation) => {
        switch (invocation.method) {
            case "get":
                // Safe to treat as a Thread/get response
                console.log("Thread list:", invocation.getArgument("list"));
                break;
            case "changes":
                // This is a Thread/changes response — different arguments
                console.log("Thread changes:", invocation.getArgument("created"));
                break;
        }
    },
});
```

For this reason, prefer **method name handlers** (e.g. `"Thread/get"`) or **symbol ID handlers** when you need type-safe access to specific response arguments. Data type handlers are best suited for logging, debugging, or cases where you only have one method per data type in the request.

### Default handler

```typescript
await response.methodResponses.dispatch(
    {
        "Mailbox/get": (invocation) => {
            /* ... */
        },
    },
    // Default handler for any unmatched invocations
    (invocation) => {
        console.log("Unhandled:", invocation.name);
    },
);
```

### Async handlers

Handlers can be async. Dispatch processes invocations sequentially, awaiting each handler before moving to the next:

```typescript
await response.methodResponses.dispatch({
    "Email/get": async (invocation: ReturnType<typeof Email.response.get>) => {
        const emails = invocation.getArgument("list");
        await saveToDatabase(emails);
    },
});
```

### Typing handlers

Use `ReturnType<typeof DataType.response.method>` to get the correct invocation type for a handler parameter:

```typescript
type MailboxGetResponse = ReturnType<typeof Mailbox.response.get>;
type EmailGetResponse = ReturnType<typeof Email.response.get>;

await response.methodResponses.dispatch({
    "Mailbox/get": (invocation: MailboxGetResponse) => {
        // invocation.getArgument() is fully typed
        const list = invocation.getArgument("list"); // MailboxObject[]
        const state = invocation.getArgument("state"); // string
    },
});
```

## Method 2: manual iteration

`InvocationList` is iterable. You can loop over invocations and handle them manually:

```typescript
import { isErrorInvocation } from "jmap-kit";

for (const invocation of response.methodResponses) {
    if (isErrorInvocation(invocation)) {
        console.error("Error:", invocation.type);
        continue;
    }

    console.log(invocation.name, invocation.arguments);
}
```

The `isErrorInvocation()` type guard narrows the type to `ErrorInvocation`, which has a `type` property (e.g. `"serverFail"`, `"invalidArguments"`) and does not have a `dataType` property.

## InvocationList properties

| Property / Method              | Type            | Description                           |
| ------------------------------ | --------------- | ------------------------------------- |
| `size`                         | `number`        | Number of invocations in the response |
| `dispatch(handlers, default?)` | `Promise<void>` | Route invocations to handlers         |
| `[Symbol.iterator]()`          | `Iterator`      | Iterate over all invocations          |
