import { z } from "zod/v4";
import type { CapabilityDefinition, ValidationPlugin } from "../../src/capability-registry/types.js";
import type { JMAPCapability, JMAPMethodName } from "../../src/index.js";
import { Invocation } from "../../src/index.js";
import type {
    BaseGetRequestInvocationArgs,
    BaseGetResponseInvocationArgs,
    BaseSetRequestInvocationArgs,
    BaseSetResponseInvocationArgs,
    InvocationArgs,
    InvocationFactory,
    InvocationFactoryCollection,
} from "../../src/invocation/types.js";

/*
 * This file defines a complete custom JMAP capability from scratch.
 *
 * It follows the same patterns used by the built-in capabilities (Core, Email,
 * etc.) and demonstrates every step: type definitions, invocation class,
 * factories, validation plugin, session schemas, and type registry augmentation.
 *
 * No server connection is needed for this file — it purely defines types and
 * factories. The companion file (custom-capability.ts) shows how to register
 * and use this capability with a client.
 */

// ---------------------------------------------------------------------------
// Capability URI
// ---------------------------------------------------------------------------

export const WIDGET_CAPABILITY_URI = "urn:example:jmap:widget";

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/** The Widget object as stored on the server. */
export type WidgetObject = {
    id: string;
    name: string;
    colour: string;
    size: number;
    createdAt: string;
};

/** Request arguments for Widget/get. */
export type WidgetGetRequestInvocationArgs = BaseGetRequestInvocationArgs<WidgetObject>;

/** Response arguments for Widget/get. */
export type WidgetGetResponseInvocationArgs = BaseGetResponseInvocationArgs<WidgetObject>;

/** Request arguments for Widget/set. */
export type WidgetSetRequestInvocationArgs = BaseSetRequestInvocationArgs<WidgetObject>;

/** Response arguments for Widget/set. */
export type WidgetSetResponseInvocationArgs = BaseSetResponseInvocationArgs<WidgetObject>;

/** Union of all Widget invocation argument types. */
type WidgetRequestInvocationArgs = WidgetGetRequestInvocationArgs | WidgetSetRequestInvocationArgs;
type WidgetResponseInvocationArgs = WidgetGetResponseInvocationArgs | WidgetSetResponseInvocationArgs;
type WidgetInvocationArgs = WidgetRequestInvocationArgs | WidgetResponseInvocationArgs;

// ---------------------------------------------------------------------------
// Invocation class
// ---------------------------------------------------------------------------

/**
 * WidgetInvocation extends the abstract Invocation base class, binding all
 * Widget method calls to the Widget capability URI.
 */
class WidgetInvocation<TArgs extends WidgetInvocationArgs> extends Invocation<TArgs> {
    get uri(): JMAPCapability {
        return WIDGET_CAPABILITY_URI;
    }

    constructor(method: JMAPMethodName, args: InvocationArgs<TArgs>, methodCallId?: symbol) {
        super("Widget", method, args, methodCallId);
    }

    static createInvocationFactory<TArgs extends WidgetInvocationArgs>(
        method: JMAPMethodName,
    ): InvocationFactory<TArgs, WidgetInvocation<TArgs>> {
        return (args, methodCallId) => new WidgetInvocation<TArgs>(method, args, methodCallId);
    }
}

// ---------------------------------------------------------------------------
// Factory object
// ---------------------------------------------------------------------------

/** Factory functions for creating Widget invocations. */
export const Widget = {
    request: {
        get: WidgetInvocation.createInvocationFactory<WidgetGetRequestInvocationArgs>("get"),
        set: WidgetInvocation.createInvocationFactory<WidgetSetRequestInvocationArgs>("set"),
    },
    response: {
        get: WidgetInvocation.createInvocationFactory<WidgetGetResponseInvocationArgs>("get"),
        set: WidgetInvocation.createInvocationFactory<WidgetSetResponseInvocationArgs>("set"),
    },
} satisfies InvocationFactoryCollection;

// ---------------------------------------------------------------------------
// Validation plugin
// ---------------------------------------------------------------------------

/**
 * Validates Widget/set create operations against account-level limits.
 *
 * Reads `maxWidgetNameLength` from the account's Widget capability data
 * (account.accountCapabilities[WIDGET_CAPABILITY_URI]), mirroring the
 * pattern used by the built-in mailbox name length validator in the Email
 * capability. This demonstrates how the type registry augmentation (below)
 * provides full autocompletion and type safety in validators.
 */
export const widgetSetValidator: ValidationPlugin<"invocation", WidgetSetRequestInvocationArgs> = {
    name: "widget-set-validation",
    hook: "invocation",
    trigger: {
        dataType: "Widget",
        method: "set",
    },
    validate(context) {
        const { invocation, accounts } = context;
        const accountId = invocation.getArgument("accountId");
        const create = invocation.getArgument("create");

        if (!create) {
            return { valid: true };
        }

        const account = accounts[accountId];
        if (!account) {
            return { valid: false, errors: [new Error(`Account "${accountId}" does not exist.`)] };
        }

        // The type augmentation below gives us typed access here —
        // IDEs will autocomplete `widgetCaps.maxWidgetNameLength` etc.
        const widgetCaps = account.accountCapabilities[WIDGET_CAPABILITY_URI];
        if (!widgetCaps) {
            return {
                valid: false,
                errors: [new Error(`Account "${accountId}" does not support the Widget capability.`)],
            };
        }

        const errors: Error[] = [];
        for (const [clientId, widget] of Object.entries(create)) {
            if (widget.name.length > widgetCaps.maxWidgetNameLength) {
                errors.push(
                    new Error(
                        `Widget "${clientId}" name exceeds server limit of ${widgetCaps.maxWidgetNameLength} characters` +
                            ` (got ${widget.name.length})`,
                    ),
                );
            }
        }

        return errors.length > 0 ? { valid: false, errors } : { valid: true };
    },
};

// ---------------------------------------------------------------------------
// Session schemas (StandardSchema via Zod)
// ---------------------------------------------------------------------------

/** Schema for session.capabilities[WIDGET_CAPABILITY_URI]. */
const widgetServerCapabilitySchema = z.looseObject({
    maxWidgets: z.number().int().min(1),
});

/** Schema for account.accountCapabilities[WIDGET_CAPABILITY_URI]. */
const widgetAccountCapabilitySchema = z.looseObject({
    maxWidgetsPerAccount: z.number().int().min(1),
    maxWidgetNameLength: z.number().int().min(1),
    supportsColours: z.boolean(),
});

// ---------------------------------------------------------------------------
// Capability definition
// ---------------------------------------------------------------------------

/** The complete Widget capability, ready to register with a JMAPClient. */
export const WidgetCapability = {
    uri: WIDGET_CAPABILITY_URI,
    invocations: {
        Widget,
    },
    validators: [widgetSetValidator],
    schema: {
        serverCapability: widgetServerCapabilitySchema,
        accountCapability: widgetAccountCapabilitySchema,
    },
} satisfies CapabilityDefinition;

// ---------------------------------------------------------------------------
// Type registry augmentation
// ---------------------------------------------------------------------------

/*
 * Augmenting the type registries lets TypeScript know about the Widget
 * capability's session data. After this, accessing
 *   session.capabilities[WIDGET_CAPABILITY_URI]
 *   account.accountCapabilities[WIDGET_CAPABILITY_URI]
 * will return properly typed objects.
 */

declare module "../../src/common/types.js" {
    interface ServerCapabilityRegistry {
        [WIDGET_CAPABILITY_URI]?: EmptyObject;
    }
    interface AccountCapabilityRegistry {
        [WIDGET_CAPABILITY_URI]?: {
            maxWidgetsPerAccount: number;
            maxWidgetNameLength: number;
            supportsColours: boolean;
        };
    }
}
