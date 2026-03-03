---
title: Custom Capabilities
---

# Custom Capabilities

jmap-kit is designed to be extended with custom capabilities for JMAP extensions, vendor-specific features, or entirely new data types. This page walks through creating a capability from scratch.

## Creating a custom capability

A capability definition bundles a URI, invocation factories, and optional plugins into a single object that can be registered with the client.

### Step 1: Define types

Create an interface for your data type's object and invocation argument types. Follow the patterns in `src/capabilities/` for consistency.

```typescript
// my-capability/types.ts
import type { Id } from "jmap-kit";
import type {
    BaseGetRequestInvocationArgs,
    BaseGetResponseInvocationArgs,
    BaseSetRequestInvocationArgs,
    BaseSetResponseInvocationArgs,
} from "jmap-kit";

// The object your data type represents
export type WidgetObject = {
    id: Id;
    name: string;
    colour: string;
    size: number;
};

// Server-set properties (returned by server, not sent by client)
export type WidgetObjectServerSet = Readonly<{
    id: Id;
    createdAt: string;
}>;

// Settable properties (sent by client on create/update)
export type WidgetObjectSettable = {
    name: string;
    colour?: string;
    size?: number;
};

// Request/response args for each method
export type WidgetGetRequestArgs = BaseGetRequestInvocationArgs<WidgetObject>;
export type WidgetGetResponseArgs = BaseGetResponseInvocationArgs<WidgetObject>;
export type WidgetSetRequestArgs = BaseSetRequestInvocationArgs<WidgetObjectSettable>;
export type WidgetSetResponseArgs = BaseSetResponseInvocationArgs<WidgetObject>;

// Union types for the invocation class generic constraint
export type WidgetRequestArgs = WidgetGetRequestArgs | WidgetSetRequestArgs;
export type WidgetResponseArgs = WidgetGetResponseArgs | WidgetSetResponseArgs;
```

### Step 2: Create an invocation class

Extend `Invocation<TArgs>` and implement the `uri` getter to return your capability URI:

```typescript
// my-capability/widget.ts
import type { JMAPCapability, JMAPMethodName } from "jmap-kit";
import { Invocation } from "jmap-kit";
import type { InvocationArgs, InvocationFactory, InvocationFactoryCollection } from "jmap-kit";
import type { WidgetRequestArgs, WidgetResponseArgs } from "./types.js";

const WIDGET_CAPABILITY_URI = "urn:example:widget";

class WidgetInvocation<TArgs extends WidgetRequestArgs | WidgetResponseArgs> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return WIDGET_CAPABILITY_URI;
    }

    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("Widget", method, args, methodCallId);
    }

    static createInvocationFactory<TArgs extends WidgetRequestArgs | WidgetResponseArgs>(
        method: JMAPMethodName,
    ): InvocationFactory<TArgs, WidgetInvocation<TArgs>> {
        return (args, methodCallId) => new WidgetInvocation<TArgs>(method, args, methodCallId);
    }
}
```

### Step 3: Export invocation factories

Create a const with `request` and `response` factory objects:

```typescript
import type {
    WidgetGetRequestArgs,
    WidgetGetResponseArgs,
    WidgetSetRequestArgs,
    WidgetSetResponseArgs,
} from "./types.js";

export const Widget = {
    request: {
        get: WidgetInvocation.createInvocationFactory<WidgetGetRequestArgs>("get"),
        set: WidgetInvocation.createInvocationFactory<WidgetSetRequestArgs>("set"),
    },
    response: {
        get: WidgetInvocation.createInvocationFactory<WidgetGetResponseArgs>("get"),
        set: WidgetInvocation.createInvocationFactory<WidgetSetResponseArgs>("set"),
    },
} satisfies InvocationFactoryCollection;
```

### Step 4: Optionally create plugins

Add validation or transformation plugins if your capability has specific rules. See [Plugins](plugins.md) for the full guide.

```typescript
import type { ValidationPlugin } from "jmap-kit";

const widgetNameLengthValidator: ValidationPlugin<"invocation", WidgetSetRequestArgs> = {
    name: "widget-name-length",
    hook: "invocation",
    trigger: {
        dataType: "Widget",
        method: "set",
    },
    validate(context) {
        const { invocation } = context;
        const create = invocation.getArgument("create");
        if (!create) return { valid: true };

        const errors: Error[] = [];
        for (const [id, widget] of Object.entries(create)) {
            if (widget.name.length > 100) {
                errors.push(new Error(`Widget ${id} name exceeds 100 characters`));
            }
        }
        return errors.length > 0 ? { valid: false, errors } : { valid: true };
    },
};
```

### Step 5: Optionally define session schemas

If your capability's session data has a defined structure, provide schemas to validate it during connection. Schemas use the [StandardSchema](https://github.com/standard-schema/standard-schema) interface, so you can use any compatible validation library (Zod, Valibot, ArkType, etc.).

```typescript
import { z } from "zod/v4";

// Validates session.capabilities[WIDGET_CAPABILITY_URI]
const widgetServerCapabilitySchema = z.looseObject({
    maxWidgetsPerRequest: z.number().int().min(1),
});

// Validates account.accountCapabilities[WIDGET_CAPABILITY_URI]
const widgetAccountCapabilitySchema = z.looseObject({
    maxWidgets: z.number().int().min(1),
    supportsColours: z.boolean(),
});
```

Use `z.looseObject()` (or equivalent) so that additional properties from future server versions are accepted without failing validation.

Both schemas are optional — provide only the ones relevant to your capability. Capabilities without schemas have their session data accepted without validation.

If validation fails during connection, the capability is stripped from the session rather than causing a connection failure. See [Capabilities](capabilities.md#session-capability-validation) for details.

### Step 6: Assemble the capability definition

```typescript
import type { CapabilityDefinition } from "jmap-kit";

export const WidgetCapability: CapabilityDefinition = {
    uri: WIDGET_CAPABILITY_URI,
    invocations: {
        Widget,
    },
    validators: [widgetNameLengthValidator],
    // transformers: [],  // optional
    schema: {
        serverCapability: widgetServerCapabilitySchema,
        accountCapability: widgetAccountCapabilitySchema,
    },
};
```

### Step 7: Augment capability type registries

jmap-kit provides `ServerCapabilityRegistry` and `AccountCapabilityRegistry` interfaces that you can augment using TypeScript's `declare module`. This gives you type-safe access to your capability's properties when reading server or account capabilities from a JMAP session.

All built-in capabilities (Core, Email, Submission, VacationResponse, Blob, MaskedEmail) use this same mechanism, so your custom capability integrates at the same level as a first-party one.

```typescript
import type { EmptyObject } from "jmap-kit";

declare module "jmap-kit" {
    interface ServerCapabilityRegistry {
        [WIDGET_CAPABILITY_URI]?: EmptyObject;
    }
    interface AccountCapabilityRegistry {
        [WIDGET_CAPABILITY_URI]?: {
            /** The maximum number of widgets per account. */
            maxWidgets: number;
            /** Whether the account supports widget colours. */
            supportsColours: boolean;
        };
    }
}
```

After this augmentation, accessing capability properties on `JMAPServerCapabilities` and `JMAPAccountCapabilities` is fully typed:

```typescript
// Server capabilities — typed as EmptyObject | undefined
const widgetServer = session.capabilities[WIDGET_CAPABILITY_URI];

// Account capabilities — typed with maxWidgets, supportsColours
const widgetAccount = account.accountCapabilities[WIDGET_CAPABILITY_URI];
if (widgetAccount) {
    console.log("Max widgets:", widgetAccount.maxWidgets);
    console.log("Supports colours:", widgetAccount.supportsColours);
}
```

If your capability has no server- or account-level configuration, use `EmptyObject` for the property type. Properties should be optional (`?:`) unless the capability is always present (only Core is required by the JMAP spec).

### Step 8: Register and use

```typescript
await client.registerCapabilities(WidgetCapability);

const request = client.createRequestBuilder();
request.add(Widget.request.get({ accountId, ids: null }));
const response = await request.send();

await response.methodResponses.dispatch({
    "Widget/get": (invocation: ReturnType<typeof Widget.response.get>) => {
        console.log("Widgets:", invocation.getArgument("list"));
    },
});
```
