---
title: Custom Capability
---

# Custom Capability Example

This example demonstrates how to write a complete custom JMAP capability from scratch and use it with a client.

## Files

- **`widget-capability.ts`** — The capability definition (no server needed): type definitions, invocation class, factories, validation plugin, session schemas, and type registry augmentation.
- **`custom-capability.ts`** — Using the capability with a client (server-connected): registers the capability, builds a request, and inspects the resulting request body.

## Prerequisites

- Node.js
- A JMAP server and a bearer token (for `custom-capability.ts`)

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
yarn tsx examples/custom-capability/custom-capability.ts
```

## What It Does

### widget-capability.ts (the capability)

1. **Defines a capability URI** — `urn:example:jmap:widget`
2. **Defines types** — `WidgetObject`, request/response argument types using the standard `BaseGet*`/`BaseSet*` generics
3. **Creates an invocation class** — `WidgetInvocation` extending `Invocation<TArgs>` with the Widget URI
4. **Exports factory functions** — `Widget.request.get()`, `Widget.request.set()`, and their response counterparts
5. **Defines a validation plugin** — `widgetNameLengthValidator` checks that widget names don't exceed 100 characters in `Widget/set` create operations
6. **Defines session schemas** — Zod schemas for server and account capability data
7. **Assembles the capability definition** — `WidgetCapability` combining URI, invocations, validators, and schemas
8. **Augments TypeScript registries** — `declare module` for `ServerCapabilityRegistry` and `AccountCapabilityRegistry`

### custom-capability.ts (using it)

1. **Registers `WidgetCapability`** alongside `EmailCapability`
2. **Builds a request** with `Widget/get` and `Widget/set` invocations
3. **Inspects the request body** — shows the `using` array includes the Widget URI and the method calls use `Widget/get` and `Widget/set`
4. **Does NOT send** — no server supports Widget, but the example demonstrates that custom capabilities integrate fully into the request pipeline

## Key Concepts

### Capability Structure

A `CapabilityDefinition` assembles:

- `uri` — the capability identifier
- `invocations` — factory collections keyed by data type
- `validators` — validation plugins for the capability's methods
- `schema` — StandardSchema validators for session capability data

### Type Registry Augmentation

`declare module` extends the global type registries so TypeScript knows about the custom capability's session data:

```typescript
declare module "../../src/common/types.js" {
    interface ServerCapabilityRegistry {
        [WIDGET_CAPABILITY_URI]?: EmptyObject;
    }
    interface AccountCapabilityRegistry {
        [WIDGET_CAPABILITY_URI]?: {
            maxWidgetsPerAccount: number;
            supportsColours: boolean;
        };
    }
}
```

## Notes

- The Widget capability follows the exact same patterns as built-in capabilities like `EmailCapability` and `CoreCapability`.
- Custom capabilities get proper `using` URIs, method call IDs, and run through the validation pipeline automatically.
- See `guide/custom-capabilities.md` for the full guide on writing custom capabilities.
