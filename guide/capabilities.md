---
title: Capabilities
---

# Capabilities

JMAP uses capability URIs to identify sets of functionality. A server advertises which capabilities it supports in the session object, and the client includes the relevant URIs in each request's `using` array. jmap-kit models capabilities as registered definitions that bundle invocation factories, validators, and transformers together.

## Built-in capabilities

| Capability       | URI                                        | Data types                            | Export                       |
| ---------------- | ------------------------------------------ | ------------------------------------- | ---------------------------- |
| Core             | `urn:ietf:params:jmap:core`                | Core (echo)                           | `CoreCapability`             |
| Email            | `urn:ietf:params:jmap:mail`                | Mailbox, Thread, Email, SearchSnippet | `EmailCapability`            |
| EmailSubmission  | `urn:ietf:params:jmap:submission`          | EmailSubmission, Identity             | `SubmissionCapability`       |
| VacationResponse | `urn:ietf:params:jmap:vacationresponse`    | VacationResponse                      | `VacationResponseCapability` |
| Blob             | `urn:ietf:params:jmap:blob`                | Blob                                  | `BlobCapability`             |
| MaskedEmail      | `https://www.fastmail.com/dev/maskedemail` | MaskedEmail                           | `MaskedEmailCapability`      |

The URI constants are also exported for use in your code (e.g. `EMAIL_CAPABILITY_URI`, `CORE_CAPABILITY_URI`).

> **Note:** The `Blob` export (used for `Blob.request.copy(...)`, etc.) shadows the global `Blob` Web API. If your code needs both, alias one on import:
>
> ```typescript
> import { Blob as JMAPBlob } from "jmap-kit";
> ```

## Registering capabilities

Before using any data type methods, register the corresponding capability with the client. The Core capability is always registered automatically.

```typescript
import { EmailCapability, MaskedEmailCapability } from "jmap-kit";

await client.registerCapabilities(EmailCapability, MaskedEmailCapability);
```

`registerCapabilities()` is async and returns a `CapabilityRegistrationResult` containing arrays of any validation failures. When called before connecting, capabilities are registered without validation and the result arrays are empty.

When called after connecting, each capability's schema is validated against the session data. Capabilities that fail validation are rejected and not registered. You can inspect the result to check for failures:

```typescript
const result = await client.registerCapabilities(MyCapability);
if (result.serverCapabilities.length > 0) {
    console.warn("Some capabilities were rejected:", result.serverCapabilities);
}
```

You can register multiple capabilities in a single call. Already-registered capabilities are skipped without re-validation. Adding invocations to a request will fail if the required capability has not been registered.

## Checking capability support

After connecting, you can check whether the server supports a given capability:

```typescript
import { EMAIL_CAPABILITY_URI } from "jmap-kit";

if (client.isSupported(EMAIL_CAPABILITY_URI)) {
    // Server supports mail capabilities
}
```

This checks the server's session object. Before connecting, `isSupported()` returns `true` only for the Core capability.

## Automatic `using` inclusion

You do not need to manually manage the `using` array in requests. When you add an invocation to a request builder, the library automatically includes its capability URI in the `using` set:

```typescript
import { Mailbox } from "jmap-kit";

const request = client.createRequestBuilder();
request.add(Mailbox.request.get({ accountId }));

// request.using now contains both urn:ietf:params:jmap:core and urn:ietf:params:jmap:mail
```

When the request is built, the `using` array appears in the serialised JSON:

```json
{
    "using": ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
    "methodCalls": [["Mailbox/get", { "accountId": "abc123" }, "id_0"]]
}
```

The Core capability URI is always included in every request, as required by [RFC 8620 errata (EID 6606)](https://www.rfc-editor.org/errata/eid6606).

## What a capability definition contains

A capability definition bundles together:

- **`uri`** — the capability URI string
- **`invocations`** — an object mapping data type names to their `{ request, response }` factory collections
- **`validators`** (optional) — validation plugins that run during request processing
- **`transformers`** (optional) — transformation plugins that modify requests before sending
- **`schema`** (optional) — [StandardSchema](https://github.com/standard-schema/standard-schema) validators for the capability's session data (see [Session Capability Validation](#session-capability-validation))

For example, the `EmailCapability` includes invocation factories for Mailbox, Thread, Email, and SearchSnippet, validators for account support, mailbox name length, and query sort options, and a schema for validating its account capability properties.

See [Plugins](plugins.md) for details on validators and transformers, and [Custom Capabilities](custom-capabilities.md) for how to create your own.

## Session capability validation

Each JMAP session contains server-level and account-level capability data. Capabilities can provide schemas to validate their slice of this data during connection. This catches misconfigured or non-compliant servers early rather than failing unpredictably at runtime.

### How it works

When `client.connect()` fetches the session, validation happens in two phases:

1. **Structural validation** — the session is checked for required top-level fields, account shape, and the presence of the Core capability key
2. **Capability-specific validation** — each registered capability with a `schema` has its session data validated against that schema

Schemas use the [StandardSchema](https://github.com/standard-schema/standard-schema) interface, so any compatible validation library (Zod, Valibot, ArkType, etc.) can be used.

### What happens when validation fails

- **Core capability failure** — the connection throws an error. The client cannot operate without valid Core capability data.
- **Non-Core capability failure** — the capability is **stripped** from the session. It is removed from `serverCapabilities`, all relevant `accountCapabilities`, and `primaryAccounts`. The client logs a warning for each stripped capability and emits an `"invalid-capabilities"` event with `context: "connection"`.

This graceful degradation means the client can still operate with the remaining valid capabilities. See [Customisation](customisation.md) for details on the `"invalid-capabilities"` event.

### Built-in schemas

| Capability       | Server schema | Account schema |
| ---------------- | :-----------: | :------------: |
| Core             |      Yes      |       No       |
| Email            |      No       |      Yes       |
| EmailSubmission  |      No       |      Yes       |
| Blob             |      No       |      Yes       |
| VacationResponse |      No       |       No       |
| MaskedEmail      |      No       |       No       |

Capabilities without schemas pass through unvalidated. Third-party capabilities use the same mechanism — see [Custom Capabilities](custom-capabilities.md) for how to add schemas to your own capabilities.
