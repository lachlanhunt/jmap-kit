---
title: Validation Plugins
---

# Validation Plugins Example

This example demonstrates how to write and register custom validation plugins that enforce constraints on JMAP requests before they are sent.

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
yarn tsx examples/validation-plugins/validation-plugins.ts
```

## What It Does

1. **Defines a custom validator** — a plugin that requires every `Core/echo` invocation to include a `"requestId"` argument
2. **Registers it** as part of a lightweight `CapabilityDefinition` (no invocation factories, just the validator)
3. **Sends a failing request** — a `Core/echo` call without `"requestId"`, catching and displaying the `AggregateError`
4. **Sends a passing request** — a corrected `Core/echo` call with `"requestId"`, showing the full pass/fail contrast

## Key Concepts

### Validation Plugin Structure

A validation plugin has four parts:

```typescript
const myValidator: ValidationPlugin<"invocation"> = {
    name: "my-validator", // Unique identifier
    hook: "invocation", // Lifecycle hook
    trigger: {
        // When to run
        dataType: "Core",
        method: "echo",
    },
    validate(context) {
        // The validation logic
        // Return { valid: true } or { valid: false, errors: [...] }
    },
};
```

### Lifecycle Hooks

Validators can run at different points in the request pipeline:

| Hook                   | Runs                        | Context                   |
| ---------------------- | --------------------------- | ------------------------- |
| `"invocation"`         | Once per method call        | Individual invocation     |
| `"pre-build"`          | Before request construction | Full JMAP request         |
| `"pre-serialization"`  | Before JSON serialisation   | Full JMAP request         |
| `"post-serialization"` | After JSON serialisation    | Serialised body + headers |

### Trigger Filtering

For `"invocation"` hooks, the trigger filters which method calls the validator applies to:

- `capabilityUri` — match by capability URI
- `dataType` — match by data type (e.g., `"Core"`, `"Email"`)
- `method` — match by method name (e.g., `"echo"`, `"get"`, `"set"`)

Omitted fields match any value (wildcard).

### Error Handling

When validation fails, `request.send()` throws an `AggregateError` whose `.errors` array contains the individual validation errors:

```typescript
try {
    await request.send();
} catch (error) {
    if (error instanceof AggregateError) {
        for (const e of error.errors) {
            console.error(e.message);
        }
    }
}
```

## Notes

- Validators are registered as part of a `CapabilityDefinition`. A capability can have just validators and no invocation factories.
- All registered validators run on every matching invocation, regardless of which capability registered them.
- The built-in `CoreCapability` includes validators for `maxObjectsInGet`, `maxObjectsInSet`, `maxCallsInRequest`, and `maxSizeRequest`.
