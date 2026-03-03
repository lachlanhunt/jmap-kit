---
title: Plugins
---

# Plugins

Capabilities can register validation and transformation plugins that run during request processing. Validators check that requests conform to server limits and capability rules. Transformers modify requests before they are sent (e.g. compression, encryption, header modification).

## Lifecycle phases

Plugins run at specific points during request processing, in this order:

| Phase                 | Hook name              | Validators | Transformers | Data type                                           |
| --------------------- | ---------------------- | :--------: | :----------: | --------------------------------------------------- |
| 1. Invocation         | `"invocation"`         |    Yes     |      No      | Individual invocation                               |
| 2. Pre-build          | `"pre-build"`          |    Yes     |      No      | Constructed `JMAPRequest`                           |
| 3. Pre-serialisation  | `"pre-serialization"`  |    Yes     |     Yes      | `JMAPRequest`                                       |
| 4. Post-serialisation | `"post-serialization"` |    Yes     |     Yes      | `{ body: string \| Blob \| ..., headers: Headers }` |

- **Invocation** — runs once per method call in the request. Used for checking individual invocations (e.g. are the `ids` within limits?)
- **Pre-build** — runs on the assembled `JMAPRequest` before serialisation. Used for request-level checks (e.g. how many method calls are in the batch?)
- **Pre-serialisation** — runs on the `JMAPRequest` after pre-build validation. Both validators and transformers can operate here
- **Post-serialisation** — runs on the serialised body and headers. Used for size checks, compression, or header modification

## Synchronous and asynchronous plugins

Both `validate()` and `transform()` methods may be implemented as either synchronous or asynchronous — return a plain value or a `Promise`. The library awaits the result in either case.

Most plugins are synchronous because they only inspect the request data in memory. Use an async implementation when your plugin needs to perform I/O, such as:

- Calling an external API to verify account permissions or feature flags
- Reading from a database or cache
- Performing compression or encryption that uses async APIs (e.g. the Web Crypto API)
- Fetching remote configuration that governs validation rules

```typescript
// Synchronous — inspects request data directly
validate(context) {
    const ids = context.invocation.getArgument("ids");
    if (ids && ids.length > 100) {
        return { valid: false, errors: [new Error("Too many IDs")] };
    }
    return { valid: true };
}

// Asynchronous — calls an external service
async validate(context) {
    const accountId = context.invocation.getArgument("accountId");
    const allowed = await checkPermissions(accountId);
    if (!allowed) {
        return { valid: false, errors: [new Error("Account not permitted")] };
    }
    return { valid: true };
}
```

## Validation plugins

A validation plugin checks a request and returns a pass/fail result.

### Interface

```typescript
type ValidationPlugin<THook, TArgs> = {
    name: string;
    hook: THook;
    trigger: ValidationPluginTrigger<THook>;
    validate(context: ValidationPluginContext<THook, TArgs>): ValidationResult | Promise<ValidationResult>;
};

type ValidationResult = { valid: true } | { valid: false; errors: Error[] };
```

### Trigger filtering

For the `"invocation"` hook, the trigger controls which invocations the plugin runs on:

```typescript
trigger: {
    capabilityUri?: JMAPCapability;  // Match invocations from this capability
    dataType?: JMAPDataType;         // Match invocations for this data type
    method?: JMAPMethodName;         // Match invocations for this method
}
```

Omitted fields match any value (wildcard). For example, `{ method: "set" }` runs on every `/set` invocation regardless of capability or data type, while `{ dataType: "Mailbox", method: "set" }` only runs on `Mailbox/set`.

For lifecycle hooks (`"pre-build"`, `"pre-serialization"`, `"post-serialization"`), the trigger can specify a required server capability:

```typescript
trigger: {
    requiredCapabilityUri?: JMAPCapability;  // Only run if server supports this capability
}
```

An empty trigger `{}` means the plugin always runs.

### Context

The context provided to `validate()` depends on the hook:

**All hooks** receive:

- `serverCapabilities` — the server's capability configuration
- `accounts` — the session's account map

**Invocation hook** additionally receives:

- `invocation` — the specific invocation being validated

**Pre-build / pre-serialisation** additionally receives:

- `data` — the `JMAPRequest` object (with `using` and `methodCalls`)

**Post-serialisation** additionally receives:

- `data.body` — the serialised request body (`string | Blob | ArrayBuffer | File`)
- `data.headers` — the HTTP headers (`Headers`)

### Execution

All validators for a given hook run concurrently. Their errors are aggregated into a single `AggregateError` that is thrown if any validator fails. The request is not sent.

If a validator's `validate()` method throws an exception, it is caught and wrapped as a validation error with the message `"Validator '{name}' failed"`.

### Built-in core validators

The Core capability registers these validators automatically:

| Validator             | Hook                   | Trigger           | What it checks                                             |
| --------------------- | ---------------------- | ----------------- | ---------------------------------------------------------- |
| `maxObjectsInGet`     | `"invocation"`         | `method: "get"`   | `ids` array length vs `maxObjectsInGet`                    |
| `maxObjectsInSet`     | `"invocation"`         | `method: "set"`   | Total create + update + destroy count vs `maxObjectsInSet` |
| `collationAlgorithms` | `"invocation"`         | `method: "query"` | Sort collation values vs `collationAlgorithms`             |
| `accountReadOnly`     | `"invocation"`         | `method: "set"`   | Target account is not read-only                            |
| `blobCopyReadOnly`    | `"invocation"`         | `Blob/copy`       | Target account is not read-only                            |
| `maxCallsInRequest`   | `"pre-build"`          | (always)          | `methodCalls` length vs `maxCallsInRequest`                |
| `maxSizeRequest`      | `"post-serialization"` | (always)          | Serialised body size vs `maxSizeRequest`                   |

The Email capability adds its own validators for account support, mailbox constraints, and query sort options.

### Example: custom invocation validator

```typescript
import type { ValidationPlugin } from "jmap-kit";
import type { EmailSetRequestInvocationArgs } from "jmap-kit";

const noEmptySubjectPlugin: ValidationPlugin<"invocation", EmailSetRequestInvocationArgs> = {
    name: "no-empty-subject",
    hook: "invocation",
    trigger: {
        dataType: "Email",
        method: "set",
    },
    validate(context) {
        const { invocation } = context;
        const create = invocation.getArgument("create");

        if (!create) return { valid: true };

        const errors: Error[] = [];
        for (const [id, email] of Object.entries(create)) {
            if (!email.subject) {
                errors.push(new Error(`Email ${id} has no subject`));
            }
        }

        return errors.length > 0 ? { valid: false, errors } : { valid: true };
    },
};
```

## Transformation plugins

A transformation plugin modifies the request data at a given lifecycle phase. Transformers are only available on `"pre-serialization"` and `"post-serialization"` hooks (not `"pre-build"`).

### Interface

```typescript
type TransformationPlugin<THook> = {
    name: string;
    hook: THook;
    trigger: PluginTrigger;
    transform(context: PluginContext<THook>): PluginData<THook> | Promise<PluginData<THook>>;
};
```

The `transform()` method receives the current context and returns modified data. The return type depends on the hook:

- **`"pre-serialization"`** — return a `JMAPRequest`
- **`"post-serialization"`** — return `{ body, headers }`

### Execution

Transformers run **sequentially**, in registration order. Each transformer receives the output of the previous one. This allows chaining (e.g. transform the request, then compress it, then add a checksum header).

### Trigger

The trigger uses the same `requiredCapabilityUri` mechanism as lifecycle validators:

```typescript
trigger: {
    requiredCapabilityUri?: JMAPCapability;  // Only run if server supports this capability
}
```

### Example: gzip compression

```typescript
import type { TransformationPlugin } from "jmap-kit";

const gzipPlugin: TransformationPlugin<"post-serialization"> = {
    name: "gzip-compression",
    hook: "post-serialization",
    trigger: {},
    async transform(context) {
        const { data } = context;

        // Convert the body to a byte stream
        const bodyBytes =
            typeof data.body === "string"
                ? new TextEncoder().encode(data.body)
                : new Uint8Array(await new Response(data.body).arrayBuffer());

        // Compress using the CompressionStream API
        const compressed = await new Response(
            new Blob([bodyBytes]).stream().pipeThrough(new CompressionStream("gzip")),
        ).blob();

        const headers = new Headers(data.headers);
        headers.set("Content-Encoding", "gzip");

        return { body: compressed, headers };
    },
};
```

## Including plugins in a capability

Plugins are registered as part of a capability definition:

```typescript
import type { CapabilityDefinition } from "jmap-kit";

const MyCapability: CapabilityDefinition = {
    uri: "urn:example:my-capability",
    invocations: {
        /* ... */
    },
    validators: [myInvocationValidator, myPreBuildValidator],
    transformers: [myCompressionTransformer],
};

client.registerCapabilities(MyCapability);
```

All plugins from all registered capabilities are collected and run at the appropriate lifecycle phases when a request is sent.
