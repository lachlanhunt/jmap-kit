import type { Mocked } from "vitest";
import { vi } from "vitest";
import { CORE_CAPABILITY_URI, EMAIL_CAPABILITY_URI } from "../common/registry.js";
import type { CapabilityDefinition, TransformationPlugin, ValidationPlugin } from "./types.js";

// Mock capability URI constants
export const CUSTOM_CAPABILITY_URI = "https://example.com/jmap/custom";

export const invocationValidator: Mocked<ValidationPlugin<"invocation">> = {
    name: "mock-invocation",
    hook: "invocation",
    trigger: {
        method: "get",
    },
    validate: vi.fn<ValidationPlugin<"invocation">["validate"]>((_ctx) => ({ valid: true })),
};

// Mock validation plugins
export const preBuildValidator: Mocked<ValidationPlugin<"pre-build">> = {
    name: "mock-pre-build",
    hook: "pre-build",
    trigger: {},
    validate: vi.fn<ValidationPlugin<"pre-build">["validate"]>((_ctx) => ({ valid: true })),
};

export const preSerializationValidator: Mocked<ValidationPlugin<"pre-serialization">> = {
    name: "mock-pre-serialization",
    hook: "pre-serialization",
    trigger: {},
    validate: vi.fn<ValidationPlugin<"pre-serialization">["validate"]>((_ctx) => ({ valid: true })),
};

export const postSerializationValidator: Mocked<ValidationPlugin<"post-serialization">> = {
    name: "mock-post-serialization",
    hook: "post-serialization",
    trigger: {},
    validate: vi.fn<ValidationPlugin<"post-serialization">["validate"]>((_ctx) => ({ valid: true })),
};

// Create mock transformers with different behaviours
export const modifyingTransformer: Mocked<TransformationPlugin<"pre-serialization">> = {
    name: "modifying-transformer",
    hook: "pre-serialization",
    trigger: {},
    transform: vi.fn<TransformationPlugin<"pre-serialization">["transform"]>((ctx) => ({
        using: [...ctx.data.using, "added-capability"],
        methodCalls: ctx.data.methodCalls,
    })),
};

export const asyncModifyingTransformer: Mocked<TransformationPlugin<"pre-serialization">> = {
    name: "async-modifying-transformer",
    hook: "pre-serialization",
    trigger: {},
    transform: vi.fn<TransformationPlugin<"pre-serialization">["transform"]>(async (ctx) => {
        await Promise.resolve();
        return {
            using: [...ctx.data.using, "async-added-capability"],
            methodCalls: ctx.data.methodCalls,
        };
    }),
};

export const conditionalTransformer: Mocked<TransformationPlugin<"pre-serialization">> = {
    name: "conditional-transformer",
    hook: "pre-serialization",
    trigger: { requiredCapabilityUri: "non-existent-capability" },
    /* istanbul ignore next */
    transform: vi.fn<TransformationPlugin<"pre-serialization">["transform"]>((ctx) => ({
        using: [...ctx.data.using, "should-not-be-added"],
        methodCalls: ctx.data.methodCalls,
    })),
};

export const asyncTransformer: Mocked<TransformationPlugin<"pre-serialization">> = {
    name: "async-transformer",
    hook: "pre-serialization",
    trigger: {},
    transform: vi.fn<TransformationPlugin<"pre-serialization">["transform"]>(async (ctx) => {
        // Simulate async work
        await Promise.resolve();
        return {
            using: ctx.data.using,
            methodCalls: [...ctx.data.methodCalls, ["Core/echo", {}, "async-id"]],
        };
    }),
};

export const preSerializationTransformer: Mocked<TransformationPlugin<"pre-serialization">> = {
    name: "mock-pre-serialization-transformer",
    hook: "pre-serialization",
    trigger: {},
    transform: vi.fn<TransformationPlugin<"pre-serialization">["transform"]>((ctx) => ctx.data),
};

export const preSerializationErrorTransformer: Mocked<TransformationPlugin<"pre-serialization">> = {
    name: "error-transformer",
    hook: "pre-serialization",
    trigger: {},
    transform: vi.fn<TransformationPlugin<"pre-serialization">["transform"]>(() => {
        throw new Error("Transformer error");
    }),
};

export const postSerializationTransformer: Mocked<TransformationPlugin<"post-serialization">> = {
    name: "mock-post-serialization-transformer",
    hook: "post-serialization",
    trigger: {},
    transform: vi.fn<TransformationPlugin<"post-serialization">["transform"]>((ctx) => ctx.data),
};

export const postSerializationErrorTransformer: Mocked<TransformationPlugin<"post-serialization">> = {
    name: "error-transformer",
    hook: "post-serialization",
    trigger: {},
    transform: vi.fn<TransformationPlugin<"post-serialization">["transform"]>(() => {
        throw new Error("Transformer error");
    }),
};

// Mock capability definitions
export const coreCapability: CapabilityDefinition = {
    uri: CORE_CAPABILITY_URI,
    invocations: {},
    validators: [preBuildValidator, invocationValidator],
    transformers: [],
};

export const mailCapability: CapabilityDefinition = {
    uri: EMAIL_CAPABILITY_URI,
    invocations: {},
    validators: [preSerializationValidator],
    transformers: [preSerializationTransformer],
};

// Factory for creating mock capabilities with custom validators/transformers
export function createMockCapability(partial: Partial<CapabilityDefinition>): CapabilityDefinition {
    return {
        uri: partial.uri ?? CORE_CAPABILITY_URI,
        invocations: partial.invocations ?? {},
        validators: partial.validators ?? [],
        transformers: partial.transformers ?? [],
    };
}
